# AI Service Contract

## 1. Tổng quan

AI Service là service nội bộ dùng FastAPI. Backend Spring Boot gọi AI Service qua REST API sau khi đã xác thực và phân quyền người dùng.

Base URL local đề xuất:

```txt
http://localhost:8000
```

AI Service không nhận JWT của user trong MVP. Nếu cần bảo vệ service nội bộ, có thể thêm `X-Internal-Api-Key` sau.

## 2. Nguyên tắc response

Mỗi endpoint nên trả response JSON ổn định.

Thành công:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Thất bại:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi ngắn gọn"
  }
}
```

Mã lỗi đề xuất:

| Code | Ý nghĩa |
|---|---|
| `FILE_NOT_FOUND` | Không tìm thấy file |
| `UNSUPPORTED_FILE_TYPE` | Định dạng file không hỗ trợ |
| `EMPTY_DOCUMENT` | Không trích xuất được text |
| `PARSER_ERROR` | Lỗi parse tài liệu |
| `EMBEDDING_ERROR` | Lỗi sinh embedding |
| `RETRIEVAL_ERROR` | Lỗi truy xuất vector |
| `GENERATION_ERROR` | Lỗi sinh answer/summary/quiz |
| `INVALID_OUTPUT` | Output AI không đúng schema |

## 3. Health check

### `GET /health`

Dùng để kiểm tra AI Service đang chạy.

Response:

```json
{
  "status": "ok",
  "service": "ai-service"
}
```

## 4. Process document

### `POST /process-document`

Backend gọi endpoint này sau khi Teacher/Admin upload tài liệu và muốn xử lý AI.

Request:

```json
{
  "document_id": "doc_123",
  "lecture_id": "lec_123",
  "file_path": "uploads/lectures/lec_123/document.pdf",
  "file_type": "pdf",
  "reprocess": false
}
```

Field:

| Field | Required | Ghi chú |
|---|---:|---|
| `document_id` | Yes | Id document do Backend quản lý |
| `lecture_id` | Yes | Id lecture dùng để filter retrieval |
| `file_path` | Yes | Đường dẫn file mà AI Service đọc được |
| `file_type` | Yes | `pdf` hoặc `txt` |
| `reprocess` | No | Nếu true, xóa chunks cũ và xử lý lại |

Response thành công:

```json
{
  "success": true,
  "data": {
    "document_id": "doc_123",
    "lecture_id": "lec_123",
    "status": "processed",
    "chunk_count": 18
  },
  "error": null
}
```

Response thất bại vì file scan/rỗng:

```json
{
  "success": false,
  "data": {
    "document_id": "doc_123",
    "lecture_id": "lec_123",
    "status": "failed"
  },
  "error": {
    "code": "EMPTY_DOCUMENT",
    "message": "Không trích xuất được text từ tài liệu"
  }
}
```

Backend nên cập nhật `documents.status` theo response:

- `processed` nếu `success = true`.
- `failed` nếu `success = false`.

## 5. Answer question

### `POST /answer-question`

Backend gọi endpoint này khi Student hỏi đáp với một lecture.

Request:

```json
{
  "lecture_id": "lec_123",
  "question": "RAG là gì?",
  "top_k": 5
}
```

Field:

| Field | Required | Ghi chú |
|---|---:|---|
| `lecture_id` | Yes | Chỉ retrieve chunks của lecture này |
| `question` | Yes | Câu hỏi của Student |
| `top_k` | No | Mặc định 5, giới hạn đề xuất 3-8 |

Response thành công có thông tin:

```json
{
  "success": true,
  "data": {
    "answer": "RAG là kỹ thuật kết hợp truy xuất thông tin liên quan từ tài liệu với mô hình sinh ngôn ngữ để tạo câu trả lời bám sát nguồn.",
    "citations": [
      {
        "document_id": "doc_123",
        "page_number": 2,
        "chunk_index": 4,
        "source_text": "Retrieval-Augmented Generation truy xuất nội dung liên quan trước khi sinh câu trả lời.",
        "score": 0.82
      }
    ],
    "not_found": false
  },
  "error": null
}
```

Response khi không có context phù hợp:

```json
{
  "success": true,
  "data": {
    "answer": "Không tìm thấy thông tin này trong bài giảng đã cung cấp.",
    "citations": [],
    "not_found": true
  },
  "error": null
}
```

Backend nên lưu:

- Câu hỏi của Student.
- Câu trả lời AI.
- `not_found`.
- Danh sách citations.

## 6. Generate summary

### `POST /generate-summary`

Backend gọi endpoint này khi Teacher/Admin yêu cầu sinh summary cho lecture.

Request:

```json
{
  "lecture_id": "lec_123",
  "summary_type": "study"
}
```

Field:

| Field | Required | Ghi chú |
|---|---:|---|
| `lecture_id` | Yes | Lecture cần sinh summary |
| `summary_type` | No | `general`, `study`, hoặc `exam_review` |

Response:

```json
{
  "success": true,
  "data": {
    "lecture_id": "lec_123",
    "summary_type": "study",
    "content": "## Tóm tắt tổng quan\n...\n## Các ý chính\n...",
    "source_chunk_count": 18
  },
  "error": null
}
```

Backend lưu kết quả vào `summaries` với status `draft`. Student chỉ xem khi Backend publish.

## 7. Generate quiz

### `POST /generate-quiz`

Backend gọi endpoint này khi Teacher/Admin yêu cầu sinh quiz cho lecture.

Request:

```json
{
  "lecture_id": "lec_123",
  "num_questions": 10,
  "include_short_answer": true
}
```

Field:

| Field | Required | Ghi chú |
|---|---:|---|
| `lecture_id` | Yes | Lecture cần sinh quiz |
| `num_questions` | No | Mặc định 10 |
| `include_short_answer` | No | Mặc định true |

Response:

```json
{
  "success": true,
  "data": {
    "lecture_id": "lec_123",
    "questions": [
      {
        "type": "MCQ",
        "question": "Mục đích chính của RAG là gì?",
        "options": [
          {
            "label": "A",
            "content": "Tăng tốc giao diện người dùng"
          },
          {
            "label": "B",
            "content": "Truy xuất nội dung liên quan trước khi sinh câu trả lời"
          },
          {
            "label": "C",
            "content": "Thay thế hoàn toàn database"
          },
          {
            "label": "D",
            "content": "Nén file tài liệu"
          }
        ],
        "correct_answer": "B",
        "explanation": "RAG dùng bước retrieval để lấy context liên quan, sau đó generation dựa trên context đó.",
        "source": {
          "document_id": "doc_123",
          "page_number": 2,
          "chunk_index": 4
        }
      },
      {
        "type": "SHORT_ANSWER",
        "question": "Giải thích ngắn gọn vai trò của citation trong RAG.",
        "sample_answer": "Citation giúp người học kiểm chứng câu trả lời với nội dung nguồn trong tài liệu.",
        "explanation": "Citation làm tăng tính minh bạch và giảm rủi ro AI trả lời sai lệch.",
        "source": {
          "document_id": "doc_123",
          "page_number": 3,
          "chunk_index": 6
        }
      }
    ]
  },
  "error": null
}
```

Backend lưu quiz với status `draft`. Teacher/Admin có quyền sửa câu hỏi, đáp án, giải thích và publish.

## 8. Đề xuất biến môi trường

```env
OPENAI_API_KEY=
DATABASE_URL=postgresql://user:password@localhost:5432/lms_rag
EMBEDDING_MODEL=text-embedding-3-small
GENERATION_MODEL=gpt-4o-mini
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
DEFAULT_TOP_K=5
```

Tên model có thể thay đổi theo quyết định của nhóm. Cần chốt trước khi code để tránh lệch cấu hình.

## 9. Việc cần chốt với Backend

- Kiểu id trong database: UUID hay BIGINT.
- AI Service đọc file qua `file_path` local hay Backend gửi file/content.
- Bảng `document_chunks` do Backend migration tạo hay AI Service tự tạo.
- Khi `process-document` failed, Backend cập nhật `documents.error_message` như thế nào.
- Format lưu citation trong Backend.
- Giới hạn dung lượng file upload, WBS đang đề xuất 20MB.
- Có cần internal API key giữa Backend và AI Service trong MVP không.

