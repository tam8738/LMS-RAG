# Quyết định tích hợp Backend - AI Service

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
**Phạm vi:** Document processing và document-scoped RAG

File này chỉ ghi quyết định kiến trúc và ownership. Payload HTTP nằm trong
`04_AI_API_CONTRACT.md`; SQL nằm trong `05_DATABASE_SCHEMA.md`.

## 1. ID

Mục tiêu thống nhất:

```txt
PostgreSQL: BIGINT/BIGSERIAL
Java: Long
Python/JSON: int
```

Current Backend vẫn có `Course`/`Lecture` dùng UUID `String`; đây là việc phải
refactor trước Document MVP.

## 2. Luồng upload và file

Frontend upload multipart vào Backend. Backend:

1. Xác thực Teacher và ownership lecture.
2. Validate type/size.
3. Tạo Document để lấy `document_id`.
4. Lưu file vào shared storage.
5. Lưu `storage_key`.
6. Tạo processing job.
7. Tự động gọi AI ở background.

Backend không gửi multipart sang AI. AI nhận JSON chứa `storage_key`.

## 3. Shared storage

Docker named volume:

```txt
uploads
```

Mount:

```txt
Backend: /storage/uploads (read-write)
AI:      /storage/uploads (read-only)
```

Biến môi trường chung:

```txt
UPLOAD_ROOT=/storage/uploads
```

## 4. Storage key

Format duy nhất:

```txt
documents/{document_id}/{version}/source.{extension}
```

Ví dụ:

```txt
documents/12/v1/source.pdf
```

`storage_key`:

- Là relative path.
- Chỉ dùng `/`.
- Không chứa `..`, drive Windows, `:` hoặc absolute path.
- Mỗi lần thay file tăng version để tránh ghi đè file đang được xử lý.

## 5. File support

Core MVP:

```txt
PDF
TXT
max 20 MB
```

Không OCR, DOCX hoặc PPTX trực tiếp.

Backend validate để phản hồi sớm. AI validate lại tại service boundary.

## 6. Auto-processing

AI endpoint xử lý đồng bộ từ góc nhìn Backend. Backend chạy lời gọi trong
background worker:

```txt
upload transaction commit
-> application event
-> @TransactionalEventListener(AFTER_COMMIT)
-> @Async worker
-> POST /v1/process-document
-> update Document/job
```

Không giữ database transaction trong lúc gọi AI. Không dùng message queue trong
MVP.

Retry/reprocess:

- Chỉ chạy khi `FAILED` hoặc Teacher thay file/yêu cầu lập chỉ mục lại.
- Chặn hai active job cho cùng document.
- AI atomic replace chunks; lỗi insert phải rollback và giữ chunks cũ.

## 7. Status ownership

Backend là nguồn sự thật của:

```txt
documents.processing_status
documents.publication_status
document_processing_jobs.status
```

AI chỉ trả kết quả xử lý; không cập nhật Document hoặc publication.

## 8. Authentication

Frontend -> Backend:

```txt
Authorization: Bearer <JWT>
```

Backend -> AI:

```txt
X-Internal-Key: <shared-secret>
```

AI không xử lý JWT. Internal key rỗng, thiếu hoặc sai phải fail closed.

## 9. RAG scope

Backend gửi danh sách:

```txt
document_ids
```

Backend kiểm quyền từng ID trước khi gọi AI:

- Owner dùng document của mình khi `PROCESSED`.
- Người khác chỉ dùng document `PUBLISHED`.

AI retrieval chỉ query chunks thuộc `document_ids`. `lecture_id` có thể được
lưu làm metadata nhưng không phải scope bắt buộc của answer endpoint.

Không làm RAG toàn Library trong core MVP.

## 10. Database ownership

- Backend quản lý toàn bộ migration.
- Backend sở hữu tables nghiệp vụ và status.
- AI ghi/thay thế/truy vấn `document_chunks`.
- Backend không tự ghi chunks trong flow bình thường.
- Hai service dùng chung PostgreSQL trong MVP.

## 11. Response và error

- JSON dùng `snake_case`.
- AI trả success/error envelope thống nhất.
- RAG trả JSON đầy đủ; chưa dùng SSE.
- Backend ánh xạ AI error sang public API phù hợp.
- Backend quản lý job status khi AI timeout/lỗi.

## 12. Ownership matrix

| Nội dung | Backend | AI Service |
|---|---|---|
| JWT và role | Chủ trì | Không |
| Ownership/publication permission | Chủ trì | Không |
| Upload/file metadata | Chủ trì | Không |
| Shared file | Ghi/xóa | Đọc |
| Processing job/status | Chủ trì | Trả kết quả |
| Parse/clean/chunk | Không | Chủ trì |
| Embedding | Không | Chủ trì |
| Migration | Chủ trì | Review |
| Ghi/query chunks | Không | Chủ trì |
| RAG permission | Chủ trì | Tin `document_ids` đã được kiểm |
| Retrieval/generation/citation | Không | Chủ trì |
| Admin review/Library | Chủ trì | Không |

## 13. Environment

Backend:

```txt
UPLOAD_ROOT=/storage/uploads
AI_SERVICE_BASE_URL=http://ai-service:8000
INTERNAL_API_KEY=...
MAX_FILE_SIZE_MB=20
```

AI:

```txt
UPLOAD_ROOT=/storage/uploads
DATABASE_URL=postgresql://...
INTERNAL_API_KEY=...
OPENAI_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

Backend và AI phải dùng cùng `INTERNAL_API_KEY`.
