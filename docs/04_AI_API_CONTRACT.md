# AI Service Internal API Contract

**Phiên bản:** 1.4
**Cập nhật:** 07/07/2026
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

## 6. Process document

### `POST /v1/process-document`

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

## 7. Answer question

Implementation status AI-02: đã có repository retrieval `search_similar_chunks` đọc `document_chunks` theo `document_ids`. HTTP endpoint `/v1/answer-question`, generation và response citation hoàn chỉnh thuộc AI-03, chưa có trong code hiện tại.

### `POST /v1/answer-question`

Request:

```json
{
  "document_ids": [12],
  "question": "Chuẩn hóa dữ liệu là gì?",
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
| `RETRIEVAL_ERROR` | 503 | Lỗi query retrieval từ `document_chunks` |
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

Khi triển khai, scope cũng dùng `document_ids`, không dùng subject/topic/chapter làm scope duy nhất.