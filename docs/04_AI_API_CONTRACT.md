# AI Service Internal API Contract

**Phiên bản:** 1.8
**Cập nhật:** 26/07/2026
**Base URL Docker:** `http://ai-service:8000/v1`

## 1. Phạm vi core

```txt
GET  /v1/health
GET  /v1/health/pgvector
POST /v1/analyze-document
POST /v1/index-document
POST /v1/answer-question
POST /v1/generate-quiz
```

`POST /v1/process-document` là endpoint cũ có thể giữ tạm như implementation tương đương `index-document` trong giai đoạn chuyển tiếp.


Quiz generation hiện đã có endpoint nội bộ `/v1/generate-quiz` để sinh quiz draft có cấu trúc từ
`document_chunks`. AI Service chỉ sinh bản nháp; Backend đã nối gọi, validate, lưu DB và quản lý
`DRAFT -> PUBLISHED`; Frontend đã có luồng Teacher review/publish và trang public để người học làm quiz.
AI không xử lý public URL, chấm điểm, attempt/result hoặc xếp hạng.

## 2. Quy ước

- JSON dùng `snake_case`.
- ID là JSON number, tương ứng `BIGINT/Long`.
- Frontend không gọi AI trực tiếp.
- Mọi request nghiệp vụ cần `X-Internal-Key`.
- `Content-Type: application/json`.
- AI không nhận `course_id` hoặc `lecture_id` trong core MVP.
- Nếu cần metadata, dùng `subject`, `topic`, `chapter`, `tags` như thông tin phụ của Document.

## 3. Authentication

Header:

```http
X-Internal-Key: <shared-secret>
```

Thiếu/sai key:

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

HTTP `401`.

## 4. Envelope

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Thành công"
}
```

`message` là optional; client không được phụ thuộc hoàn toàn vào field này.

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi",
    "details": [
      {
        "field": "field_name",
        "message": "Chi tiết"
      }
    ]
  }
}
```

## 5. Health

### `GET /v1/health`

Không yêu cầu internal key.

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

Yêu cầu `X-Internal-Key`. Kiểm tra PostgreSQL và extension pgvector.

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

## 6. Analyze document

### `POST /v1/analyze-document`

Endpoint này chỉ kiểm tra tài liệu có thể RAG được hay không. Endpoint này không sinh embedding và không ghi `document_chunks`.

Request:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF"
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_id` | Yes | Positive BIGINT |
| `storage_key` | Yes | Relative path dưới `UPLOAD_ROOT` |
| `file_type` | Yes | `PDF` hoặc `TXT` |
| `metadata` | No | Không bắt buộc cho bước kiểm tra RAG |

Success `200`, tài liệu có thể RAG:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "can_rag": true,
    "rag_status": "READY_TO_INDEX",
    "page_count": 20,
    "estimated_token_count": 18420,
    "estimated_chunk_count": 24,
    "unsupported_reason": null
  },
  "message": "Tài liệu có thể xử lý RAG"
}
```

Success `200`, tài liệu không hỗ trợ RAG nhưng vẫn có thể lưu như tài liệu thường:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "can_rag": false,
    "rag_status": "UNSUPPORTED",
    "page_count": 0,
    "estimated_token_count": 0,
    "estimated_chunk_count": 0,
    "unsupported_reason": "EMPTY_DOCUMENT"
  },
  "message": "Tài liệu không hỗ trợ RAG"
}
```

Hành vi:

1. Resolve `storage_key` dưới `UPLOAD_ROOT`.
2. Validate file tồn tại, đúng PDF/TXT và không quá size.
3. Parse/clean/chunk nhẹ để biết có text usable hay không.
4. Trả `READY_TO_INDEX` nếu có thể chạy `/v1/index-document` sau khi Admin approve.
5. Trả `UNSUPPORTED` nếu file hợp lệ nhưng không có text để RAG.
6. Không cập nhật bảng `documents`; Backend là nơi cập nhật DB/status.

Implementation status: endpoint `/v1/analyze-document` đã có trong AI Service, nằm ở file riêng để có thể gỡ bỏ ít ảnh hưởng code cũ.
## 7. Index document

### `POST /v1/index-document`

Endpoint này tạo chunks/embedding và ghi `document_chunks`. Backend gọi sau khi Admin approve. Implementation hiện đã có trong AI Service và dùng lại `ProcessDocumentService`; `/v1/process-document` được giữ để tương thích code cũ.

### Legacy compatibility: `POST /v1/process-document`

Request:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
  "reprocess": false,
  "metadata": {
    "subject": "Cơ sở dữ liệu",
    "topic": "Chuẩn hóa dữ liệu",
    "chapter": "Chương 3",
    "tags": ["database", "normalization"]
  }
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_id` | Yes | Positive BIGINT |
| `storage_key` | Yes | Relative path dưới `UPLOAD_ROOT` |
| `file_type` | Yes | `PDF` hoặc `TXT` |
| `reprocess` | No | Mặc định `false` |
| `metadata` | No | Metadata của Document, AI không dùng để phân quyền |

Success `200`:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "status": "PROCESSED",
    "page_count": 20,
    "chunk_count": 48
  },
  "message": "Tài liệu đã được xử lý thành công"
}
```

Hành vi:

1. Resolve/validate file.
2. Parse, clean, chunk.
3. Sinh embedding.
4. Atomic replace chunks.
5. Trả count; không cập nhật bảng `documents`.

## 8. Answer question

Implementation status AI-09: `/v1/answer-question` now uses grounded LLM generation after retrieval. Backend still checks permissions first; AI retrieves chunks by `document_ids`, filters by similarity threshold, then sends only those retrieved chunks to the generation provider.

### `POST /v1/answer-question`

Request:

```json
{
  "document_ids": [12],
  "question": "Chuẩn hóa dữ liệu là gì?",
  "top_k": 5,
  "language": "vi",
  "history": [
    {"role": "user", "content": "Chuẩn hóa dữ liệu là gì?"},
    {"role": "assistant", "content": "Chuẩn hóa giúp giảm dư thừa dữ liệu."}
  ]
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_ids` | Yes | 1-10 positive BIGINT IDs |
| `question` | Yes | Không rỗng, giới hạn độ dài |
| `top_k` | No | Mặc định 5, từ 3 đến 8 |
| `language` | No | `vi` hoặc `en`, mặc định `vi` |
| `history` | No | Tối đa 6 message `{role, content}` với `role=user|assistant`; dùng cho multi-turn retrieval, không lưu DB |

Backend phải kiểm permission của tất cả `document_ids` trước khi gọi. `history` là stateless context do Backend/Frontend gửi theo từng request; AI không tạo `conversation_id` và không lưu lịch sử hội thoại trong MVP.

Success `200`:

```json
{
  "success": true,
  "data": {
    "answer": "Chuẩn hóa dữ liệu là quá trình tổ chức dữ liệu để giảm dư thừa...",
    "not_found": false,
    "citations": [
      {
        "chunk_id": 120,
        "document_id": 12,
        "page_number": 5,
        "chunk_index": 7,
        "excerpt": "Chuẩn hóa dữ liệu là quá trình...",
        "score": 0.92
      }
    ],
    "tokens_used": 245
  },
  "message": "Trả lời thành công"
}
```

Không có context phù hợp vẫn trả `200`:

```json
{
  "success": true,
  "data": {
    "answer": "Không tìm thấy thông tin này trong tài liệu đã chọn.",
    "not_found": true,
    "citations": [],
    "tokens_used": 0
  },
  "message": "Không tìm thấy ngữ cảnh phù hợp"
}
```

AI does not use outside knowledge to fill missing data. After AI-09, when retrieval finds strong context, AI calls the generation model and returns provider usage in `tokens_used`. If no suitable chunk remains, AI does not call generation and still returns `not_found=true`, `citations=[]`, `tokens_used=0`.

## 9. Generate quiz draft

Implementation status AI-QUIZ-01: `/v1/generate-quiz` đã có trong AI Service và đã được
`AiServiceClient` của Backend tích hợp. Backend gọi sau khi kiểm tra Teacher và document
`PUBLISHED + PROCESSED`; AI Service lấy các chunk đại diện từ `document_chunks`, gọi generation
provider, validate JSON và trả quiz draft để Backend lưu/Teacher review.

### `POST /v1/generate-quiz`

Request:

```json
{
  "document_ids": [12],
  "question_count": 5,
  "language": "vi",
  "max_context_chunks": 12
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_ids` | Yes | 1-10 positive BIGINT IDs, Backend phải kiểm quyền trước |
| `question_count` | No | Mặc định 5, từ 1 đến 10 |
| `language` | No | `vi` hoặc `en`, mặc định `vi` |
| `max_context_chunks` | No | Mặc định theo `QUIZ_CONTEXT_CHUNKS`, từ 3 đến 24 |

Success `200`:

```json
{
  "success": true,
  "data": {
    "title": "Câu hỏi ôn tập",
    "description": "Bộ câu hỏi được sinh từ tài liệu đã chọn.",
    "questions": [
      {
        "question": "Mục tiêu chính của chuẩn hóa cơ sở dữ liệu là gì?",
        "type": "single_choice",
        "options": [
          {"id": "A", "text": "Tăng số lượng bảng càng nhiều càng tốt"},
          {"id": "B", "text": "Giảm dư thừa và hạn chế bất thường dữ liệu"},
          {"id": "C", "text": "Thay thế hoàn toàn khóa chính"},
          {"id": "D", "text": "Chỉ dùng cho cơ sở dữ liệu NoSQL"}
        ],
        "correct_option_ids": ["B"],
        "explanation": "Tài liệu nêu chuẩn hóa giúp tổ chức dữ liệu hợp lý hơn, giảm trùng lặp và hạn chế bất thường khi cập nhật.",
        "citations": [
          {
            "chunk_id": 120,
            "document_id": 12,
            "page_number": 5,
            "chunk_index": 7,
            "excerpt": "Chuẩn hóa cơ sở dữ liệu giúp giảm dư thừa và tránh bất nhất..."
          }
        ]
      }
    ],
    "tokens_used": 820
  },
  "message": "Sinh quiz draft thanh cong"
}
```

Quy tắc:

- V1 chỉ sinh `single_choice` để đơn giản cho BE/FE review và chấm điểm.
- AI không lưu quiz, không tạo public URL, không tạo attempt/result, không chấm điểm và không xếp hạng sinh viên; các việc này thuộc Backend/Frontend hoặc hướng nâng cấp sau MVP.
- LLM chỉ trả `source_chunk_ids`; AI Service tự map sang citation thật từ context để tránh citation giả.
- Nếu không có chunks cho tài liệu đã chọn, trả `NO_CHUNKS_FOUND`.
- Nếu provider trả JSON sai shape hoặc sai số câu, trả `INVALID_OUTPUT`. Nếu model tham chiếu source chunk ngoài context, AI Service fallback về một chunk thật trong context để không làm hỏng toàn bộ quiz draft.
## 10. Error codes

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| `UNAUTHORIZED_INTERNAL_CALL` | 401 | Internal key sai |
| `INVALID_INPUT` | 422 | Payload/storage key không hợp lệ |
| `FILE_NOT_FOUND` | 404 | Không có file trong shared storage |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type không hỗ trợ |
| `FILE_TOO_LARGE` | 413 | Quá giới hạn |
| `INVALID_FILE_CONTENT` | 422 | MIME/signature/encoding sai |
| `EMPTY_DOCUMENT` | 422 | Không trích được text |
| `NO_CHUNKS_FOUND` | 404 | Không có chunks cho document IDs |
| `PROVIDER_UNAVAILABLE` | 503 | OpenAI chưa cấu hình/không sẵn sàng |
| `PROVIDER_TIMEOUT` | 504 | OpenAI timeout |
| `RETRIEVAL_ERROR` | 503 | Lỗi query retrieval từ `document_chunks` |
| `DATABASE_ERROR` | 503 | PostgreSQL/pgvector lỗi |
| `INTERNAL_ERROR` | 500 | Lỗi không dự kiến |

## 11. Timeout và retry

- Backend timeout index-document/process-document phải đủ cho tài liệu demo; gọi trong worker.
- Backend không tự retry vô hạn.
- OpenAI retry có giới hạn trong AI Service.
- Reprocess phải idempotent theo document và atomic replace.

## 12. Should-have contract

Các endpoint sau chỉ được thiết kế/implement sau core E2E:

```txt
POST /v1/generate-summary
```

Nếu triển khai summary riêng sau này, scope cũng dùng `document_ids`, không dùng subject/topic/chapter làm scope duy nhất.
