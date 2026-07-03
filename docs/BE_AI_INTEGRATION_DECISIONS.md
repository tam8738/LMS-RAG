# Thống nhất tích hợp Backend - AI Service

**Phiên bản:** 1.0  
**Ngày thống nhất:** 03/07/2026  
**Phạm vi:** Upload học liệu, xử lý AI, pgvector, RAG, summary và question/quiz  
**Trạng thái:** Đã thống nhất giữa Backend và AI

## 1. Mục đích

Tài liệu này ghi lại các quyết định chung giữa Backend và AI Service trước khi triển khai tích hợp.

Khi có khác biệt giữa tài liệu này và bản `API_Contract_LMS_RAG.docx.pdf` ngày 20/06/2026, các quyết định trong tài liệu này được ưu tiên cho phần giao tiếp Backend - AI. Sau khi implementation ổn định, API Contract tổng của dự án cần được cập nhật lại theo các quyết định này.

## 2. Các quyết định đã thống nhất

### 2.1. Kiểu ID

Toàn bộ ID nghiệp vụ hiện tại dùng `BIGINT/Long`, phù hợp với schema `BIGSERIAL` và JPA entity của Backend.

Ví dụ:

```json
{
  "document_id": 12,
  "lecture_id": 5
}
```

Không dùng UUID cho `user_id`, `course_id`, `lecture_id`, `document_id`, `chunk_id`, `quiz_id` và các ID nghiệp vụ tương ứng trong MVP.

### 2.2. Quy ước JSON

Payload HTTP dùng `snake_case`.

Ví dụ:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/source.pdf",
  "chunk_count": 48
}
```

Backend cần cấu hình Jackson `SNAKE_CASE` hoặc dùng `@JsonProperty` để khớp contract.

### 2.3. Upload và truyền file

Luồng truyền file:

```txt
Frontend --multipart--> Backend
Backend --ghi file--> shared uploads volume
Backend --JSON + storage_key--> AI Service
AI Service --đọc file--> shared uploads volume
```

Frontend vẫn upload file bằng `multipart/form-data`.

Backend không forward multipart sang AI Service. Backend gửi JSON chứa `storage_key`.

Ví dụ:

```json
{
  "document_id": 12,
  "lecture_id": 5,
  "storage_key": "documents/12/source.pdf",
  "file_type": "PDF",
  "reprocess": false
}
```

`storage_key` là đường dẫn tương đối, không phải đường dẫn tuyệt đối.

AI Service resolve file từ:

```env
UPLOAD_ROOT=/storage/uploads
```

Đường dẫn thực tế:

```txt
/storage/uploads/documents/12/source.pdf
```

AI Service phải từ chối:

- Absolute path.
- `..` path traversal.
- Storage key thoát khỏi `UPLOAD_ROOT`.
- File không tồn tại.

### 2.4. Shared Docker volume

Backend có quyền đọc/ghi. AI Service chỉ có quyền đọc.

```yaml
services:
  backend:
    volumes:
      - uploads:/storage/uploads

  ai-service:
    volumes:
      - uploads:/storage/uploads:ro

volumes:
  uploads:
```

Quy ước lưu file:

```txt
documents/{document_id}/source.{extension}
```

Backend chịu trách nhiệm:

- Sanitize filename.
- Validate file trước khi lưu.
- Ghi file an toàn.
- Sinh `storage_key`.
- Xóa file vật lý khi document bị xóa.

### 2.5. Kiểu file và giới hạn

MVP hỗ trợ:

- PDF có thể trích xuất text.
- TXT.
- Dung lượng tối đa 20MB.

Không hỗ trợ trong MVP:

- OCR.
- PDF scan không có text.
- PPTX/DOCX trực tiếp.
- Ảnh.

Backend validate trước khi lưu. AI Service validate lại trước khi parse.

### 2.6. Quản lý job và trạng thái

Backend quản lý:

- `job_id`.
- Bảng/trạng thái processing job.
- `documents.status`.
- Public polling endpoint cho Frontend.

AI Service không quản lý job và không cung cấp `GET /v1/jobs/{job_id}` trong MVP.

AI endpoint `/v1/process-document` xử lý đồng bộ từ góc nhìn Backend.

Backend có thể chạy lời gọi AI trong background executor/`@Async`, nhưng không dùng queue ngoài trong MVP.

Luồng:

```txt
1. Backend nhận upload và tạo Document: UPLOADED.
2. Teacher gọi process.
3. Backend tạo processing job.
4. Backend cập nhật Document/Job: PROCESSING.
5. Backend gọi AI /v1/process-document.
6. AI parse, clean, chunk, embed và lưu chunks.
7. AI trả kết quả đồng bộ.
8. Backend cập nhật PROCESSED hoặc FAILED.
9. Frontend polling job từ Backend.
```

### 2.7. Document status

Giá trị thống nhất:

```txt
UPLOADED
PROCESSING
PROCESSED
FAILED
```

Backend là nguồn sự thật của document status.

AI Service không cập nhật trực tiếp bảng `documents`.

AI trả trạng thái kết quả trong response để Backend cập nhật.

### 2.8. API version

Backend public API:

```txt
/api/v1
```

AI internal API:

```txt
/v1
```

Ví dụ:

```txt
POST /v1/process-document
GET  /v1/health
```

### 2.9. Internal API authentication

Các endpoint AI, trừ health check, yêu cầu:

```http
X-Internal-Key: <secret>
```

Biến môi trường:

```env
INTERNAL_API_KEY=
```

Quy tắc:

- `GET /v1/health` không yêu cầu internal key.
- Các endpoint nghiệp vụ yêu cầu internal key.
- Thiếu hoặc sai key trả HTTP 401.
- Không log giá trị key.
- Không commit key thật vào repository.

### 2.10. Response envelope

Các API JSON dùng envelope chung.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

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

Không trả đồng thời `data` và `error`.

### 2.11. HTTP status

| Trường hợp | HTTP status |
|---|---:|
| Thành công | 200 |
| Tạo mới | 201 |
| Job Backend được tạo | 202 |
| Request không hợp lệ | 400 |
| Internal key sai/thiếu | 401 |
| Không có quyền nghiệp vụ | 403 |
| Không tìm thấy tài nguyên/file | 404 |
| File hợp lệ về request nhưng không xử lý được | 422 |
| Lỗi nội bộ/provider/database | 500/502/503 |

### 2.12. Error codes AI

Giá trị thống nhất:

```txt
INVALID_INPUT
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

### 2.13. Database ownership

Backend quản lý:

- Database migrations.
- Bảng nghiệp vụ.
- Foreign keys và indexes.

AI Service được phép:

- Đọc document/lecture metadata cần thiết.
- Insert/update/delete `document_chunks`.
- Truy vấn vector để retrieval.

AI Service không được:

- Thay đổi user/course membership.
- Tự cập nhật document status.
- Tự publish summary/quiz.

### 2.14. Vector configuration

MVP thống nhất:

```txt
Embedding model: text-embedding-3-small
Dimensions: 1536
Similarity: cosine
PostgreSQL type: VECTOR(1536)
Index operator class: vector_cosine_ops
```

Nếu đổi embedding model hoặc dimensions, phải cập nhật đồng thời:

- AI environment.
- Database migration.
- Vector index.
- Tài liệu contract.

### 2.15. Reprocess document

Khi `reprocess=false` và document đã có chunks:

- AI trả lỗi `INVALID_INPUT` hoặc kết quả idempotent theo implementation đã thống nhất.
- Backend không tự động gọi lại nếu không có yêu cầu reprocess.

Khi `reprocess=true`:

1. AI parse, clean, chunk và embed trước.
2. Mở database transaction.
3. Xóa chunks cũ của document.
4. Insert chunks mới.
5. Commit.

Nếu insert lỗi, transaction rollback và chunks cũ vẫn còn.

### 2.16. Xóa document

Schema dùng:

```sql
document_chunks.document_id REFERENCES documents(id) ON DELETE CASCADE
```

Backend xóa document và file vật lý. Database tự cascade xóa chunks.

Endpoint AI `DELETE /v1/documents/{document_id}/chunks` không bắt buộc trong MVP.

### 2.17. RAG response

MVP trả JSON đầy đủ, chưa bắt buộc SSE.

```json
{
  "success": true,
  "data": {
    "answer": "Nội dung trả lời",
    "not_found": false,
    "citations": []
  }
}
```

SSE streaming là phần mở rộng sau khi RAG JSON hoạt động ổn định.

### 2.18. Summary và question/quiz

Summary type:

```txt
OVERVIEW
STUDY_REVIEW
```

Question type:

```txt
SINGLE_CHOICE
MULTIPLE_CHOICE
SHORT_ANSWER
```

Quiz generation hỗ trợ:

```txt
scope_type: LECTURE | CHAPTER | CUSTOM_CONTENT
difficulty: EASY | MEDIUM | HARD | MIXED
language: vi | en
```

`SHORT_ANSWER` chỉ có đáp án mẫu và giải thích, chưa chấm tự động bằng AI trong MVP.

AI trả source metadata cho câu hỏi nếu xác định được:

```json
{
  "document_id": 12,
  "chunk_id": 120,
  "page_number": 5
}
```

## 3. Ownership matrix

| Nội dung | Backend | AI Service |
|---|---|---|
| Upload multipart từ Frontend | Chủ trì | Không |
| Validate upload ban đầu | Chủ trì | Validate lại |
| Lưu file/shared volume | Chủ trì | Đọc |
| Document metadata/status | Chủ trì | Không cập nhật |
| Processing job/polling | Chủ trì | Không quản lý |
| Parse/Clean/Chunk | Không | Chủ trì |
| Embedding | Không | Chủ trì |
| Migration schema | Chủ trì | Review |
| Ghi `document_chunks` | Không | Chủ trì |
| Retrieval vector | Không | Chủ trì |
| Xác thực người dùng | Chủ trì | Không |
| Internal API key | Gửi | Kiểm tra |
| Publish summary/quiz | Chủ trì | Không |

## 4. Các tài liệu cần đồng bộ theo quyết định này

- `AI_SERVICE_CONTRACT.md`
- `AI_PIPELINE.md`
- Database schema/migrations của Backend
- Docker Compose và env template
- API Contract tổng của dự án
- README setup môi trường

## 5. Nội dung chưa implement tại thời điểm chốt

Tài liệu này là quyết định thiết kế. Các phần sau cần được implement sau khi tài liệu được merge:

- Shared uploads volume.
- `INTERNAL_API_KEY`.
- Prefix `/v1` trong FastAPI.
- `/v1/process-document`.
- Parser/Cleaner/Chunker/Embedding.
- Processing job phía Backend.
- Schema/migration `document_chunks`.
- RAG JSON contract.

