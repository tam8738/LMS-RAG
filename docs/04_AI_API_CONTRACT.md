# AI Service Internal API Contract

**Phiên bản:** 1.5
**Cập nhật:** 11/07/2026
**Base URL Docker:** `http://ai-service:8000/v1`

## 1. Phạm vi core

```txt
GET  /v1/health
GET  /v1/health/pgvector
POST /v1/analyze-document
POST /v1/index-document
POST /v1/answer-question
```

`POST /v1/process-document` là endpoint cũ đã có trong code hiện tại. Từ contract v1.5 trở đi, luồng mới tách thành `analyze-document` và `index-document`. Endpoint cũ chỉ nên giữ tạm để backward compatibility hoặc test cũ, không phải hướng triển khai chính.

Summary và question generation là Should-have, không thuộc core demo.

## 2. Quy ước chung

- JSON dùng `snake_case`.
- ID là JSON number, tương ứng `BIGINT/Long`.
- Frontend không gọi AI trực tiếp.
- Mọi request nghiệp vụ cần `X-Internal-Key`.
- `Content-Type: application/json`.
- AI không nhận `course_id` hoặc `lecture_id` trong core MVP.
- Metadata `subject`, `topic`, `chapter`, `tags` chỉ là thông tin phụ của Document.
- Backend là nơi kiểm quyền user/document; AI chỉ tin `document_id`/`document_ids` mà Backend đã cho phép.

## 3. Authentication

Header:

```http
X-Internal-Key: <shared-secret>
```

Thiếu/sai key trả HTTP `401`:

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
    "details": []
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
    "environment": "docker"
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

Endpoint này chạy ngay sau upload. Mục tiêu là phân tích nhẹ để biết tài liệu có đọc được và có đủ điều kiện RAG hay không. Endpoint này **không chunk/embed** và **không ghi `document_chunks`**.

Request:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
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
| `metadata` | No | Metadata của Document, AI không dùng để phân quyền |

Success `200`, tài liệu hỗ trợ RAG:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "status": "PROCESSED",
    "rag_status": "READY_TO_INDEX",
    "rag_supported": true,
    "page_count": 20,
    "estimated_token_count": 18420,
    "estimated_chunk_count": 24,
    "unsupported_reason": null
  },
  "message": "Tài liệu đã được phân tích thành công"
}
```

Success `200`, tài liệu không hỗ trợ RAG nhưng vẫn có thể publish như tài liệu thường:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "status": "PROCESSED",
    "rag_status": "UNSUPPORTED",
    "rag_supported": false,
    "page_count": 0,
    "estimated_token_count": 0,
    "estimated_chunk_count": 0,
    "unsupported_reason": "EMPTY_DOCUMENT"
  },
  "message": "Tài liệu không hỗ trợ RAG nhưng vẫn có thể kiểm duyệt và công bố"
}
```

Hành vi:

1. Resolve `storage_key` dưới `UPLOAD_ROOT`.
2. Validate type, size, file tồn tại.
3. Parse thử PDF/TXT để kiểm tra có text layer/nội dung text.
4. Đếm `page_count` nếu có thể.
5. Ước lượng `estimated_token_count` và `estimated_chunk_count`.
6. Trả `READY_TO_INDEX` nếu đủ điều kiện RAG; trả `UNSUPPORTED` nếu tài liệu vẫn lưu được nhưng không thể RAG.
7. Không cập nhật bảng `documents`; Backend cập nhật status.

Implementation status AI-04: endpoint `/v1/analyze-document` đã có trong AI Service. Endpoint hiện dùng `StorageResolver`, `DocumentValidator` và `DocumentChunkingPipeline` để validate/parse nhẹ/estimate; chưa sinh embedding và chưa ghi `document_chunks`.

## 7. Index document

### `POST /v1/index-document`

Endpoint này chạy sau khi Admin approve document và document cần chuẩn bị RAG. Endpoint này thực hiện pipeline đầy đủ và ghi `document_chunks`.

Request:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
  "reindex": false,
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
| `reindex` | No | Mặc định `false`; nếu `true`, thay thế chunks cũ |
| `metadata` | No | Metadata phụ của Document |

Success `200`:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "rag_status": "READY",
    "page_count": 20,
    "chunk_count": 48
  },
  "message": "Tài liệu đã được lập chỉ mục RAG thành công"
}
```

Hành vi:

1. Resolve/validate file.
2. Parse đầy đủ.
3. Clean text.
4. Chunk theo token.
5. Sinh embedding.
6. Atomic replace chunks trong transaction: delete chunks cũ theo `document_id`, insert chunks mới, commit.
7. Trả `chunk_count`; không cập nhật bảng `documents`.

## 8. Answer question

Implementation status AI-03: endpoint `/v1/answer-question` đã có trong AI Service. MVP hiện trả extractive answer từ retrieved chunks và citations từ `document_chunks`; chưa dùng LLM chat/generation provider riêng.

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

Backend phải kiểm tra trước:

```txt
publication_status = PUBLISHED
rag_status = READY
```

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

AI không dùng kiến thức ngoài retrieved context để bù dữ liệu thiếu. Trong MVP hiện tại, answer được compose trực tiếp từ retrieved chunks nên `tokens_used=0`; nếu sau này thêm LLM generation thì vẫn phải giữ nguyên nguyên tắc chỉ dùng retrieved context.

## 9. Error codes

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| `UNAUTHORIZED_INTERNAL_CALL` | 401 | Internal key sai |
| `INVALID_INPUT` | 422 | Payload/storage key không hợp lệ |
| `FILE_NOT_FOUND` | 404 | Không có file trong shared storage |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type không hỗ trợ |
| `FILE_TOO_LARGE` | 413 | Quá giới hạn |
| `INVALID_FILE_CONTENT` | 422 | MIME/signature/encoding sai |
| `EMPTY_DOCUMENT` | 422 | Không trích được text |
| `UNSUPPORTED_FOR_RAG` | 200/422 | Analyze xác định tài liệu không hỗ trợ RAG; ưu tiên trả 200 với `rag_status=UNSUPPORTED` nếu tài liệu vẫn publish được |
| `NO_CHUNKS_FOUND` | 422 | Không có chunks cho document IDs |
| `PROVIDER_UNAVAILABLE` | 503 | OpenAI chưa cấu hình/không sẵn sàng |
| `PROVIDER_TIMEOUT` | 504 | OpenAI timeout |
| `RETRIEVAL_ERROR` | 503 | Lỗi query retrieval từ `document_chunks` |
| `DATABASE_ERROR` | 503 | PostgreSQL/pgvector lỗi |
| `INTERNAL_ERROR` | 500 | Lỗi không dự kiến |

## 10. Timeout và retry

- Backend timeout `analyze-document` nên ngắn hơn `index-document`.
- Backend có thể gọi `analyze-document` đồng bộ sau upload trong MVP nếu file demo nhỏ, nhưng không giữ DB transaction khi gọi AI.
- Backend gọi `index-document` sau Admin approve. MVP có thể dùng `@Async` hoặc thread đơn giản, không cần queue phức tạp.
- Backend không retry vô hạn.
- OpenAI retry có giới hạn trong AI Service.
- `index-document` phải idempotent theo `document_id` và atomic replace chunks.

## 11. Should-have contract

Chưa thuộc core demo:

```txt
POST /v1/summarize-document
POST /v1/generate-questions
```