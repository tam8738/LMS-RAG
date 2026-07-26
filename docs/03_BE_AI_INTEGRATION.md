# Quyết định tích hợp Backend - AI Service

**Phiên bản:** 1.5
**Cập nhật:** 12/07/2026
**Phạm vi:** Document processing và document-scoped RAG

File này chỉ ghi quyết định kiến trúc và ownership. Payload HTTP nằm trong
`04_AI_API_CONTRACT.md`; SQL nằm trong `05_DATABASE_SCHEMA_CONTRACT.md` và `07_BACKEND_DATABASE_SCHEMA_GUIDE.md`.

## 1. Định hướng dữ liệu

Trọng tâm của hệ thống là `Document`.

`Subject`, `topic`, `chapter` và `tags` chỉ là metadata của Document. Các metadata này dùng để:

- Phân loại tài liệu trong Library.
- Lọc/tìm kiếm tài liệu.
- Bổ sung ngữ cảnh hiển thị và RAG.
- Tránh kéo hệ thống quay lại mô hình LMS.

Không bắt Teacher tạo `Course` hoặc `Lecture` trước khi upload. Nếu repo hiện còn entity `Course/Lecture` từ hướng cũ, các entity đó không được dùng làm luồng nghiệp vụ bắt buộc của MVP mới.

## 2. ID

Mục tiêu thống nhất:

```txt
PostgreSQL: BIGINT/BIGSERIAL
Java: Long
Python/JSON: int
```

Các ID nghiệp vụ mới như `document_id`, `user_id`, `subject_id` nếu có bảng `subjects` riêng đều dùng quy ước trên.

## 3. Luồng upload và file

Frontend upload multipart vào Backend. Backend:

1. Xác thực Teacher.
2. Validate type/size.
3. Nhận metadata: `title`, `description`, `subject`, `topic`, `chapter`, `tags`.
4. Tạo Document để lấy `document_id`.
5. Lưu file vào shared storage.
6. Lưu `storage_key`.
7. Tạo processing job.
8. Tự động gọi AI ở background.

Backend không gửi multipart sang AI. AI nhận JSON chứa `storage_key`.

## 4. Shared storage

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

## 5. Storage key

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

## 6. File support

Core MVP:

```txt
PDF
TXT
max 20 MB
```

Không OCR, DOCX hoặc PPTX trực tiếp.

Backend validate để phản hồi sớm. AI validate lại tại service boundary.

## 7. Analyze và index flow

MVP mới tách hai bước AI để tránh tạo embedding cho tài liệu có thể bị reject.

Sau upload, Backend chỉ gọi analyze nhẹ:

```txt
upload transaction commit
-> background worker/fire-and-forget
-> POST /v1/analyze-document
-> success: documents.processing_status = ANALYZED
-> failed: documents.processing_status = FAILED
```

Analyze chỉ kiểm tra tài liệu có text usable để RAG hay không. Analyze không sinh embedding và không ghi `document_chunks`.

Sau Admin approve, Backend mới gọi index RAG:

```txt
Admin approve
-> documents.publication_status = PUBLISHED
-> nếu rag_eligible = true: documents.processing_status = PROCESSING
-> background worker/fire-and-forget
-> POST /v1/index-document
-> success: documents.processing_status = PROCESSED
-> failed: documents.processing_status = FAILED
```

Không giữ database transaction trong lúc gọi AI. Không dùng message queue trong MVP.

Retry/reprocess:

- Analyze lại khi Teacher thay file hoặc analyze bị `FAILED`.
- Index lại khi đã approve nhưng index bị `FAILED` hoặc cần lập chỉ mục lại.
- Chặn hai active job cho cùng document.
- AI atomic replace chunks; lỗi insert phải rollback và giữ chunks cũ.

## 8. Status ownership

Backend là nguồn sự thật của:

```txt
documents.processing_status
documents.publication_status
document_processing_jobs.status
```

AI chỉ trả kết quả xử lý; không cập nhật Document hoặc publication.

## 9. Authentication

Frontend -> Backend:

```txt
Authorization: Bearer <JWT>
```

Backend -> AI:

```txt
X-Internal-Key: <shared-secret>
```

AI không xử lý JWT. Internal key rỗng, thiếu hoặc sai phải fail closed.

## 10. RAG scope

Backend gửi danh sách:

```txt
document_ids
```

Backend kiểm quyền từng ID trước khi gọi AI:

- Owner dùng document của mình khi đã index RAG xong (`PROCESSED`).
- Người khác chỉ dùng document `PUBLISHED` và đã index RAG xong (`PROCESSED`).

AI retrieval chỉ query chunks thuộc `document_ids`. Subject/topic/chapter/tags có thể được truyền trong metadata nếu cần hiển thị hoặc logging, nhưng không thay thế permission check theo document.

Không làm RAG toàn Library trong core MVP.

### Quiz scope

Backend gửi một `document_id` dưới dạng `document_ids` tới `POST /v1/generate-quiz` sau khi kiểm tra
document tồn tại, `PUBLISHED` và `PROCESSED`. Theo contract quiz, không yêu cầu Teacher là owner của
document nguồn; Backend vẫn ghi `created_by` là Teacher hiện tại.

AI chỉ sinh draft có cấu trúc và citations thật. Backend validate response, lưu `quizzes` cùng `quiz_questions`, enforce owner và trạng thái `DRAFT -> PUBLISHED`, cung cấp danh sách quiz của Teacher, xóa draft và public endpoint cho quiz đã publish. AI không ghi các bảng quiz.

## 11. Database ownership

- Backend quản lý toàn bộ migration.
- Backend sở hữu tables nghiệp vụ và status.
- AI ghi/thay thế/truy vấn `document_chunks`.
- Backend ghi/truy vấn `quizzes` và `quiz_questions`.
- Backend không tự ghi chunks trong flow bình thường.
- Hai service dùng chung PostgreSQL trong MVP.

## 12. Response và error

- JSON dùng `snake_case`.
- AI trả success/error envelope thống nhất.
- RAG trả JSON đầy đủ; chưa dùng SSE.
- Backend ánh xạ AI error sang public API phù hợp.
- Backend quản lý job status khi AI timeout/lỗi.

## 13. Ownership matrix

| Nội dung | Backend | AI Service |
|---|---|---|
| JWT và role | Chủ trì | Không |
| Ownership/publication permission | Chủ trì | Không |
| Upload/file metadata | Chủ trì | Không |
| Subject/topic/chapter/tags | Chủ trì | Nhận làm metadata nếu cần |
| Shared file | Ghi/xóa | Đọc |
| Processing job/status | Chủ trì | Trả kết quả |
| Parse/clean/chunk | Không | Chủ trì |
| Embedding | Không | Chủ trì |
| Migration | Chủ trì | Review |
| Ghi/query chunks | Không | Chủ trì |
| RAG permission | Chủ trì | Tin `document_ids` đã được kiểm |
| Retrieval/generation/citation | Không | Chủ trì |
| Sinh nội dung quiz draft/citation | Gọi và validate | Chủ trì |
| Lưu, owner check, danh sách, sửa/xóa draft/publish/public quiz | Chủ trì | Không |
| Admin review/Library | Chủ trì | Không |

## 14. Environment

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
