# AI Service Internal API Contract

**Phiên bản:** 1.1  
**Ngày cập nhật:** 03/07/2026  
**Trạng thái:** Đã thống nhất giữa Backend và AI  
**Base URL trong Docker:** `http://ai-service:8000/v1`  
**Base URL local:** `http://localhost:8000/v1`

## 1. Phạm vi

AI Service cung cấp internal API cho Backend:

```txt
GET  /v1/health
GET  /v1/health/pgvector
POST /v1/process-document
POST /v1/answer-question
POST /v1/generate-summary
POST /v1/generate-quiz
```

AI Service không được gọi trực tiếp từ Frontend và không xử lý JWT của người dùng.

Backend chịu trách nhiệm:

- Xác thực và phân quyền.
- Kiểm tra ownership/membership.
- Quản lý document status.
- Quản lý processing job.
- Lưu summary/quiz/chat nghiệp vụ.

## 2. Quy ước chung

### 2.1. ID

ID nghiệp vụ dùng JSON number, tương ứng `BIGINT/Long`.

```json
{
  "document_id": 12,
  "lecture_id": 5
}
```

### 2.2. JSON naming

Payload dùng `snake_case`.

### 2.3. Internal authentication

Mọi endpoint nghiệp vụ yêu cầu:

```http
X-Internal-Key: <secret>
```

Không yêu cầu key với:

```txt
GET /v1/health
```

Thiếu hoặc sai key trả HTTP 401:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_INTERNAL_CALL",
    "message": "Internal API key không hợp lệ",
    "details": []
  }
}
```

### 2.4. Success envelope

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

### 2.5. Error envelope

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi rõ ràng",
    "details": [
      {
        "field": "storage_key",
        "message": "Storage key không hợp lệ"
      }
    ]
  }
}
```

### 2.6. Error codes

```txt
INVALID_INPUT
UNAUTHORIZED_INTERNAL_CALL
FILE_NOT_FOUND
UNSUPPORTED_FILE_TYPE
FILE_TOO_LARGE
EMPTY_DOCUMENT
PARSER_ERROR
DOCUMENT_NOT_PROCESSED
NO_CHUNKS_FOUND
EMBEDDING_ERROR
RETRIEVAL_ERROR
GENERATION_ERROR
INVALID_OUTPUT
DATABASE_ERROR
PROVIDER_UNAVAILABLE
INTERNAL_ERROR
```

## 3. Health check

### `GET /v1/health`

Không yêu cầu internal key.

Response `200`:

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "ai-service",
    "environment": "local"
  }
}
```

### `GET /v1/health/pgvector`

Yêu cầu `X-Internal-Key`.

Response `200`:

```json
{
  "success": true,
  "data": {
    "status": "UP",
    "database": "lms_rag",
    "pgvector_extension": "0.8.2"
  }
}
```

Nếu PostgreSQL/pgvector chưa sẵn sàng, trả HTTP 503 với `DATABASE_ERROR`.

## 4. Process document

### `POST /v1/process-document`

AI xử lý đồng bộ từ góc nhìn Backend:

```txt
resolve file -> parse -> clean -> chunk -> embed -> transaction replace chunks
```

Backend có thể gọi endpoint này trong background executor và quản lý job/status riêng.

### Request

```json
{
  "document_id": 12,
  "lecture_id": 5,
  "storage_key": "documents/12/source.pdf",
  "file_type": "PDF",
  "reprocess": false
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_id` | Yes | BIGINT/Long |
| `lecture_id` | Yes | BIGINT/Long |
| `storage_key` | Yes | Relative path dưới `UPLOAD_ROOT` |
| `file_type` | Yes | `PDF` hoặc `TXT` |
| `reprocess` | No | Mặc định `false` |

Không truyền `chunk_size` và `chunk_overlap` từ Backend. AI Service dùng cấu hình môi trường.

### Response thành công `200`

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "lecture_id": 5,
    "status": "PROCESSED",
    "page_count": 12,
    "chunk_count": 48
  },
  "message": "Học liệu đã được xử lý thành công"
}
```

### File không tồn tại `404`

```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Không tìm thấy học liệu trong shared storage",
    "details": [
      {
        "field": "storage_key",
        "message": "documents/12/source.pdf"
      }
    ]
  }
}
```

### PDF scan hoặc file rỗng `422`

```json
{
  "success": false,
  "error": {
    "code": "EMPTY_DOCUMENT",
    "message": "Không trích xuất được văn bản từ học liệu",
    "details": []
  }
}
```

### Reprocess

Khi `reprocess=true`, AI:

1. Parse/chunk/embed trước.
2. Mở transaction.
3. Xóa chunks cũ theo `document_id`.
4. Insert chunks mới.
5. Commit.

Nếu transaction lỗi, chunks cũ được giữ nguyên.

## 5. Answer question

### `POST /v1/answer-question`

MVP trả JSON đầy đủ, chưa dùng SSE.

### Request

```json
{
  "session_id": 35,
  "lecture_id": 5,
  "question": "Encapsulation trong Java là gì?",
  "top_k": 5,
  "chat_history": [
    {
      "role": "user",
      "content": "OOP là gì?"
    },
    {
      "role": "assistant",
      "content": "OOP là lập trình hướng đối tượng."
    }
  ],
  "language": "vi"
}
```

| Field | Required | Quy định |
|---|---:|---|
| `session_id` | No | Dùng để trace, AI không lưu session nghiệp vụ |
| `lecture_id` | Yes | Retrieval chỉ trong lecture này |
| `question` | Yes | Không rỗng |
| `top_k` | No | Mặc định 5, giới hạn 3-8 |
| `chat_history` | No | Lịch sử đã được Backend lọc |
| `language` | No | `vi` hoặc `en`, mặc định `vi` |

### Response thành công `200`

```json
{
  "success": true,
  "data": {
    "answer": "Encapsulation là cơ chế đóng gói dữ liệu và giới hạn truy cập trực tiếp vào trạng thái bên trong của đối tượng.",
    "not_found": false,
    "citations": [
      {
        "chunk_id": 120,
        "document_id": 12,
        "page_number": 5,
        "excerpt": "Encapsulation là tính chất bảo vệ dữ liệu...",
        "score": 0.92
      }
    ],
    "tokens_used": 620
  }
}
```

### Không tìm thấy context phù hợp `200`

```json
{
  "success": true,
  "data": {
    "answer": "Không tìm thấy thông tin này trong học liệu đã cung cấp.",
    "not_found": true,
    "citations": [],
    "tokens_used": 0
  }
}
```

Không dùng kiến thức ngoài retrieved context để bù cho dữ liệu thiếu.

## 6. Generate summary

### `POST /v1/generate-summary`

Request:

```json
{
  "lecture_id": 5,
  "summary_type": "STUDY_REVIEW",
  "language": "vi",
  "max_length": 800
}
```

`summary_type`:

```txt
OVERVIEW
STUDY_REVIEW
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "lecture_id": 5,
    "summary_type": "STUDY_REVIEW",
    "content": "Bài giảng trình bày các khái niệm chính...",
    "source_chunk_count": 18,
    "tokens_used": 1450,
    "model": "gpt-4o-mini"
  }
}
```

Backend lưu kết quả ở trạng thái `DRAFT`.

Nếu lecture chưa có chunks, trả HTTP 422 và `NO_CHUNKS_FOUND`.

## 7. Generate question/quiz

### `POST /v1/generate-quiz`

Request:

```json
{
  "lecture_id": 5,
  "scope_type": "LECTURE",
  "scope_text": null,
  "num_questions": 10,
  "question_types": [
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "SHORT_ANSWER"
  ],
  "difficulty": "MIXED",
  "language": "vi"
}
```

Giá trị:

```txt
scope_type: LECTURE | CHAPTER | CUSTOM_CONTENT
question_types: SINGLE_CHOICE | MULTIPLE_CHOICE | SHORT_ANSWER
difficulty: EASY | MEDIUM | HARD | MIXED
language: vi | en
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "lecture_id": 5,
    "questions": [
      {
        "question_text": "Mục đích chính của RAG là gì?",
        "question_type": "SINGLE_CHOICE",
        "explanation": "RAG truy xuất context trước khi sinh câu trả lời.",
        "options": [
          {
            "option_text": "Truy xuất nội dung liên quan trước khi sinh câu trả lời",
            "is_correct": true
          },
          {
            "option_text": "Thay thế hoàn toàn database",
            "is_correct": false
          }
        ],
        "correct_answer_text": null,
        "source": {
          "document_id": 12,
          "chunk_id": 120,
          "page_number": 5
        }
      },
      {
        "question_text": "Nêu vai trò của citation trong RAG.",
        "question_type": "SHORT_ANSWER",
        "explanation": "Citation giúp kiểm chứng câu trả lời.",
        "options": [],
        "correct_answer_text": "Citation liên kết câu trả lời với nguồn học liệu.",
        "source": {
          "document_id": 12,
          "chunk_id": 121,
          "page_number": 6
        }
      }
    ],
    "total": 10,
    "tokens_used": 3200,
    "model": "gpt-4o-mini"
  }
}
```

Backend lưu quiz/questions ở trạng thái `DRAFT`.

`SHORT_ANSWER` không được AI chấm tự động trong MVP.

## 8. Backend processing job contract

Phần này do Backend cung cấp cho Frontend, không phải endpoint của AI Service.

### Kích hoạt xử lý

```txt
POST /api/v1/lectures/{lecture_id}/documents/{document_id}/process
```

Response `202`:

```json
{
  "success": true,
  "data": {
    "job_id": 100,
    "document_id": 12,
    "status": "PROCESSING"
  },
  "message": "Học liệu đang được xử lý"
}
```

### Polling

```txt
GET /api/v1/document-processing-jobs/{job_id}
```

Response:

```json
{
  "success": true,
  "data": {
    "job_id": 100,
    "document_id": 12,
    "status": "PROCESSED",
    "chunk_count": 48,
    "error_code": null,
    "error_message": null,
    "completed_at": "2026-07-03T10:01:30Z"
  }
}
```

## 9. Environment contract

AI Service:

```env
APP_ENV=local
APP_NAME=LMS RAG AI Service
OPENAI_API_KEY=
DATABASE_URL=postgresql://postgres:123456@localhost:5432/lms_rag
DB_CONNECT_TIMEOUT=5
INTERNAL_API_KEY=
UPLOAD_ROOT=/storage/uploads
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
GENERATION_MODEL=gpt-4o-mini
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
DEFAULT_TOP_K=5
```

Backend:

```env
AI_SERVICE_BASE_URL=http://ai-service:8000/v1
AI_SERVICE_INTERNAL_KEY=
UPLOAD_ROOT=/storage/uploads
```

## 10. Ownership và persistence

- Backend quản lý migration.
- AI Service ghi/xóa/truy vấn `document_chunks`.
- Backend quản lý `documents` và `document_processing_jobs`.
- Backend lưu summary/quiz/chat sau khi nhận output từ AI.
- Xóa document dùng foreign key `ON DELETE CASCADE` để xóa chunks.
- AI không tự publish summary/quiz.

## 11. Endpoint không dùng trong MVP

Không dùng:

```txt
GET /v1/jobs/{job_id}
DELETE /v1/documents/{document_id}/chunks
SSE /v1/answer-question
```

Lý do:

- Job do Backend quản lý.
- Xóa chunks dùng database cascade.
- RAG trả JSON trước, SSE bổ sung sau.

