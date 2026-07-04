# AI Service Internal API Contract

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
**Base URL Docker:** `http://ai-service:8000/v1`

## 1. Phạm vi core

```txt
GET  /v1/health
GET  /v1/health/pgvector
POST /v1/process-document
POST /v1/answer-question
```

Summary và question generation là Should-have và chưa thuộc core contract.

## 2. Quy ước

- JSON dùng `snake_case`.
- ID là JSON number, tương ứng `BIGINT/Long`.
- Frontend không gọi AI trực tiếp.
- Mọi request nghiệp vụ cần `X-Internal-Key`.
- `Content-Type: application/json`.

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

## 6. Process document

### `POST /v1/process-document`

Request:

```json
{
  "document_id": 12,
  "lecture_id": 5,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
  "reprocess": false
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_id` | Yes | Positive BIGINT |
| `lecture_id` | Yes | Positive BIGINT, dùng làm metadata |
| `storage_key` | Yes | Relative path dưới `UPLOAD_ROOT` |
| `file_type` | Yes | `PDF` hoặc `TXT` |
| `reprocess` | No | Mặc định `false` |

Success `200`:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "lecture_id": 5,
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

## 7. Answer question

### `POST /v1/answer-question`

Request:

```json
{
  "document_ids": [12],
  "question": "Encapsulation trong Java là gì?",
  "top_k": 5,
  "language": "vi"
}
```

| Field | Required | Quy định |
|---|---:|---|
| `document_ids` | Yes | 1-10 positive BIGINT IDs |
| `question` | Yes | Không rỗng, giới hạn độ dài |
| `top_k` | No | Mặc định 5, từ 3 đến 8 |
| `language` | No | `vi` hoặc `en`, mặc định `vi` |

Backend phải kiểm permission của tất cả `document_ids` trước khi gọi.

Success `200`:

```json
{
  "success": true,
  "data": {
    "answer": "Encapsulation là cơ chế đóng gói dữ liệu...",
    "not_found": false,
    "citations": [
      {
        "chunk_id": 120,
        "document_id": 12,
        "page_number": 5,
        "excerpt": "Encapsulation là tính chất...",
        "score": 0.92
      }
    ],
    "tokens_used": 620
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

AI không dùng kiến thức ngoài retrieved context để bù dữ liệu thiếu.

## 8. Error codes

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| `UNAUTHORIZED_INTERNAL_CALL` | 401 | Internal key sai |
| `INVALID_INPUT` | 422 | Payload/storage key không hợp lệ |
| `FILE_NOT_FOUND` | 404 | Không có file trong shared storage |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type không hỗ trợ |
| `FILE_TOO_LARGE` | 413 | Quá giới hạn |
| `INVALID_FILE_CONTENT` | 422 | MIME/signature/encoding sai |
| `EMPTY_DOCUMENT` | 422 | Không trích được text |
| `NO_CHUNKS_FOUND` | 422 | Không có chunks cho document IDs |
| `PROVIDER_UNAVAILABLE` | 503 | OpenAI chưa cấu hình/không sẵn sàng |
| `PROVIDER_TIMEOUT` | 504 | OpenAI timeout |
| `DATABASE_ERROR` | 503 | PostgreSQL/pgvector lỗi |
| `INTERNAL_ERROR` | 500 | Lỗi không dự kiến |

## 9. Timeout và retry

- Backend timeout process-document phải đủ cho tài liệu demo; gọi trong worker.
- Backend không tự retry vô hạn.
- OpenAI retry có giới hạn trong AI Service.
- Reprocess phải idempotent theo document và atomic replace.

## 10. Should-have contract

Các endpoint sau chỉ được thiết kế/implement sau core E2E:

```txt
POST /v1/generate-summary
POST /v1/generate-questions
```

Khi triển khai, scope cũng dùng `document_ids`, không dùng lecture làm scope duy
nhất.
