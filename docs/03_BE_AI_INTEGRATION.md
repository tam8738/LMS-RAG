# Quyết định tích hợp Backend - AI Service

**Phiên bản:** 1.5
**Cập nhật:** 11/07/2026
**Phạm vi:** Document analyze, RAG indexing và document-scoped RAG

File này ghi quyết định kiến trúc và ownership. Payload HTTP nằm trong `04_AI_API_CONTRACT.md`; database contract nằm trong `05_DATABASE_SCHEMA_CONTRACT.md`.

## 1. Định hướng dữ liệu

Trọng tâm của hệ thống là `Document`.

`Subject`, `topic`, `chapter` và `tags` chỉ là metadata của Document. Các metadata này dùng để:

- Phân loại tài liệu trong Library.
- Lọc/tìm kiếm tài liệu.
- Bổ sung ngữ cảnh hiển thị và RAG.
- Tránh kéo hệ thống quay lại mô hình LMS.

Không bắt Teacher tạo `Course` hoặc `Lecture` trước khi upload.

## 2. ID

```txt
PostgreSQL: BIGINT/BIGSERIAL
Java: Long
Python/JSON: int
```

Các ID nghiệp vụ mới như `document_id`, `user_id`, `subject_id` nếu có bảng `subjects` riêng đều dùng quy ước trên.

## 3. Luồng upload và analyze nhẹ

Frontend upload multipart vào Backend. Backend:

1. Xác thực Teacher.
2. Validate type/size cơ bản.
3. Nhận metadata: `title`, `description`, `subject`, `topic`, `chapter`, `tags`.
4. Tạo Document để lấy `document_id`.
5. Lưu file vào shared storage.
6. Lưu `storage_key`.
7. Set:

```txt
processing_status = ANALYZING
publication_status = DRAFT
rag_status = NOT_ANALYZED
```

8. Gọi AI `POST /v1/analyze-document` sau khi upload/file save thành công.
9. Backend cập nhật kết quả:

```txt
Nếu AI trả READY_TO_INDEX:
processing_status = PROCESSED
rag_status = READY_TO_INDEX

Nếu AI trả UNSUPPORTED:
processing_status = PROCESSED
rag_status = UNSUPPORTED
unsupported_reason = <reason>

Nếu AI lỗi hệ thống:
processing_status = FAILED
rag_status = FAILED
analysis_error_code/message = <error>
```

Backend không gửi multipart sang AI. AI nhận JSON chứa `storage_key`.

Implementation status BE-04: Backend đã có `AiServiceClient` gọi `/v1/analyze-document` sau upload, dùng `AI_SERVICE_BASE_URL` và `INTERNAL_API_KEY`; kết quả analyze được lưu vào `processing_status`, `rag_status`, các analysis fields và `document_processing_jobs`.

## 4. Luồng review và index RAG

Teacher chỉ submit review khi:

```txt
processing_status = PROCESSED
publication_status = DRAFT hoặc REJECTED
```

Admin approve:

```txt
PENDING_REVIEW -> PUBLISHED
```

Sau khi approve:

```txt
Nếu rag_status = READY_TO_INDEX:
    Backend set rag_status = INDEXING
    Backend gọi AI POST /v1/index-document
    Nếu success: rag_status = READY, indexed_at = now
    Nếu fail: rag_status = FAILED, rag_error_code/message = <error>

Nếu rag_status = UNSUPPORTED:
    Không gọi index-document
    Document vẫn PUBLISHED như tài liệu thường
```

MVP có thể gọi `index-document` bằng `@Async` hoặc worker đơn giản. Không dùng queue phức tạp trong core MVP.

Implementation status BE-06: Backend đã gọi `/v1/index-document` trong `approveReview()` khi `rag_status=READY_TO_INDEX`; kết quả thành công cập nhật `rag_status=READY`, `indexed_at`, job chunk count; lỗi cập nhật `rag_status=FAILED` và `rag_error_code/message`.

## 5. Shared storage

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

## 6. Storage key

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

## 7. File support

Core MVP:

```txt
PDF
TXT
max 20 MB
```

Không OCR, DOCX hoặc PPTX trực tiếp. PDF scan không có text layer sẽ được analyze thành:

```txt
processing_status = PROCESSED
rag_status = UNSUPPORTED
unsupported_reason = PDF_SCAN_NO_TEXT
```

Backend validate để phản hồi sớm. AI validate lại tại service boundary.

## 8. Status ownership

Backend là nguồn sự thật của:

```txt
documents.processing_status
documents.publication_status
documents.rag_status
document_processing_jobs.status
```

AI chỉ trả kết quả analyze/index/RAG; không cập nhật `documents` hoặc `publication_status`.

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

```txt
publication_status = PUBLISHED
rag_status = READY
```

AI retrieval chỉ query chunks thuộc `document_ids`. Subject/topic/chapter/tags có thể được truyền trong metadata nếu cần hiển thị hoặc logging, nhưng không thay thế permission check theo document.

Không làm RAG toàn Library trong core MVP.

## 11. Database ownership

- Backend quản lý toàn bộ migration.
- Backend sở hữu tables nghiệp vụ và status.
- AI ghi/thay thế/truy vấn `document_chunks` khi `index-document` chạy.
- Backend không tự ghi chunks trong flow bình thường.
- Hai service dùng chung PostgreSQL trong MVP.

## 12. Response và error

- JSON dùng `snake_case`.
- AI trả success/error envelope thống nhất.
- Analyze có thể trả `rag_status = UNSUPPORTED` với HTTP 200 nếu tài liệu vẫn publish được như tài liệu thường.
- Index lỗi không bắt buộc rollback publication; Backend giữ document `PUBLISHED` và set `rag_status = FAILED`.
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
| Processing/rag/job status | Chủ trì | Trả kết quả |
| Analyze nhẹ | Gọi và lưu kết quả | Chủ trì validate/parse/estimate |
| Parse/clean/chunk | Không | Chủ trì khi index |
| Embedding | Không | Chủ trì khi index |
| Migration | Chủ trì | Review |
| Ghi/query chunks | Không | Chủ trì |
| RAG permission | Chủ trì | Tin `document_ids` đã được kiểm |
| Retrieval/generation/citation | Không | Chủ trì |
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

## 15. Luồng mới tóm tắt

```txt
Teacher upload
-> Backend lưu file
-> AI analyze nhẹ
-> processing_status = PROCESSED
-> rag_status = READY_TO_INDEX hoặc UNSUPPORTED
-> Teacher xem kết quả
-> Teacher submit review
-> Admin approve
-> Nếu READY_TO_INDEX: Backend gọi AI index-document, rag_status = READY
-> Nếu UNSUPPORTED: publish như tài liệu thường
-> Library hiển thị trạng thái RAG tương ứng
```