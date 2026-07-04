# Kế hoạch triển khai core MVP

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
**Phạm vi:** Teacher upload -> AI process -> Admin review -> Library -> RAG

## 1. Hiện trạng repository

### Backend

Đã có:

- Spring Boot, PostgreSQL, Spring Security.
- Login JWT.
- `User`, `Course`, `Lecture`, `CourseMember`.
- Role `ADMIN`, `TEACHER`, `STUDENT`.

Chưa có:

- Flyway.
- Document, processing job, upload/storage.
- AI client và background processing.
- Review/publish flow.
- Library API.
- RAG proxy.

Lệch cần sửa ngay:

- `Course` và `Lecture` đang dùng UUID `String`; mục tiêu là `Long`.
- `ddl-auto=update`; cần chuyển Flyway + `validate`.
- JWT filter đang log token.
- `CourseMember`, level/lesson/score không thuộc core MVP.

### Frontend

Chưa có source code; thư mục chỉ có `.gitkeep`.

### AI Service

Đã có:

- Health API và `POST /v1/process-document`.
- PDF/TXT validation và parser.
- Clean/chunk theo token.
- OpenAI embedding.
- Repository lưu chunks bằng transaction.
- Unit/API mock tests.

Chưa có:

- E2E thật với Backend/shared volume.
- Retrieval theo `document_ids`.
- RAG answer và citation.

## 2. Workstream Backend

### BE-01 - Chuẩn hóa nền tảng

**Phụ thuộc:** Không
**Concurrency:** Exclusive

Thực hiện:

- Đổi `Course.id`, `Lecture.id` sang `Long`.
- Thêm Flyway và baseline migration.
- Chuyển Hibernate sang `ddl-auto=validate`.
- Xóa log token.
- Cho `CustomUserDetails.isEnabled()` dùng `UserStatus`.

Hoàn thành khi Backend khởi động từ database rỗng bằng migration.

### BE-02 - Document schema và model

**Phụ thuộc:** BE-01
**Concurrency:** Exclusive

Tạo:

```txt
DocumentProcessingStatus
DocumentPublicationStatus
DocumentFileType
ProcessingJobStatus
Document
DocumentProcessingJob
DocumentRepository
DocumentProcessingJobRepository
```

Schema chính thức nằm trong `05_DATABASE_SCHEMA.md`.

### BE-03 - Storage và upload

**Phụ thuộc:** BE-02, INFRA-01

Tạo:

```txt
StorageProperties
DocumentStorageService
DocumentService
DocumentController
```

Hành vi:

- Nhận multipart PDF/TXT tối đa 20 MB.
- Validate extension, MIME, size và ownership lecture.
- Tạo Document `UPLOADED + DRAFT`.
- Lưu file dưới `UPLOAD_ROOT`.
- Sinh `storage_key` có version.
- Tạo processing job và trả `202`.

### BE-04 - Background processing và AI client

**Phụ thuộc:** BE-03, AI-01

Tạo:

```txt
AiServiceProperties
AiServiceClient
AsyncConfig
DocumentProcessingService
DocumentProcessingJobController
```

Cách làm MVP:

- Publish application event sau khi transaction upload commit.
- Dùng `@TransactionalEventListener(AFTER_COMMIT)` và `@Async`.
- Gọi AI đồng bộ bên trong worker.
- Không giữ database transaction khi gọi AI.
- Cập nhật job/document thành `PROCESSED` hoặc `FAILED`.
- Chặn hai active job cho cùng document.
- Có endpoint retry/reprocess.

### BE-05 - Review và publication

**Phụ thuộc:** BE-02

Tạo:

```txt
DocumentReviewService
AdminDocumentReviewController
```

Thực thi đúng state machine trong `01_PROJECT_PRD.md`.

### BE-06 - Library

**Phụ thuộc:** BE-05

Tạo:

```txt
LibraryService
LibraryController
```

Library chỉ trả `PUBLISHED`. Search/filter nâng cao là Should-have; core chỉ cần
pagination và search title.

### BE-07 - RAG proxy

**Phụ thuộc:** BE-06, AI-03

Tạo:

```txt
RagService
RagController
```

Backend kiểm quyền toàn bộ `document_ids` trước khi gọi AI:

- Owner dùng document của mình nếu `PROCESSED`.
- Người khác chỉ dùng `PUBLISHED`.

### BE-08 - Quản lý tài khoản Teacher

**Phụ thuộc:** BE-01
**Mức ưu tiên:** Should-have

Tạo service/controller tối giản để Admin duy nhất:

- Xem, tìm kiếm Teacher.
- Tạo Teacher với mật khẩu tạm thời đã BCrypt.
- Sửa tên/email.
- Chuyển `ACTIVE/INACTIVE`.
- Reset mật khẩu.

Không tạo thêm Admin, không đổi role, không xóa cứng và không quản lý Student.

## 3. Workstream AI

### AI-01 - Process E2E thật

**Phụ thuộc:** DB-01, INFRA-01

- Dùng schema `document_chunks` chính thức.
- Chạy `process-document` với file trong shared volume.
- Gọi OpenAI embedding thật.
- Xác nhận chunks/vector tồn tại trong PostgreSQL.
- Xác nhận reprocess rollback khi insert lỗi.

### AI-02 - Retrieval

**Phụ thuộc:** AI-01

Tạo:

```txt
RetrievedChunk schema
DocumentChunkRetrievalRepository
RetrievalService
```

Input:

```txt
document_ids
query_embedding
top_k
```

Chỉ query chunks thuộc `document_ids`, dùng cosine similarity và trả source
metadata.

### AI-03 - RAG answer và citation

**Phụ thuộc:** AI-02

Tạo:

```txt
AnswerQuestionRequest/Result
RagAnswerService
Citation builder
POST /v1/answer-question
```

Không có context phù hợp phải trả `not_found=true`. Payload chính thức nằm
trong `04_AI_API_CONTRACT.md`.

### AI-04 - Should-have

Chỉ thực hiện sau core E2E:

- Summary một document.
- Question generation từ selected documents.

## 4. Workstream Frontend

### FE-01 - Scaffold và authentication

- Khởi tạo React + Vite.
- API client gắn Bearer token.
- `ProtectedRoute`, `RoleRoute`.
- Login và điều hướng theo role.
- App shell tối giản, không dashboard.

### FE-02 - Library

**Phụ thuộc:** Contract Library đã khóa

- `/library`: danh sách `PUBLISHED`.
- Search title và pagination.
- `/library/:documentId`: metadata, download/open file.

### FE-03 - My Documents

- Danh sách tài liệu của Teacher.
- Upload form.
- Hai status badge riêng.
- Poll processing job.
- Retry/reprocess.
- Submit review.
- Hiển thị rejection reason.

### FE-04 - Admin Review

- Danh sách `PENDING_REVIEW`.
- Xem metadata và file.
- Approve.
- Reject dialog bắt buộc lý do.
- Archive document đã công bố.

### FE-05 - RAG

- `RagPanel` trong document detail.
- Gửi một `document_id` trong core demo; API vẫn dùng list.
- Hiển thị answer, not-found và citation.
- Citation mở đúng document; page deep-link là Should-have.

### FE-06 - Quản lý Teacher

**Mức ưu tiên:** Should-have

- `/admin/teachers`.
- Danh sách và tìm kiếm Teacher.
- Form tạo/sửa Teacher.
- Activate/deactivate.
- Reset mật khẩu với hộp xác nhận.

Không cần dashboard, thống kê hoặc màn hình chi tiết riêng.

## 5. Workstream Infrastructure

### INFRA-01 - Docker/shared storage

- Thêm AI Service vào Docker Compose.
- Tạo named volume `uploads`.
- Backend mount read-write tại `/storage/uploads`.
- AI mount read-only tại `/storage/uploads`.
- Cả hai dùng cùng `INTERNAL_API_KEY`.
- Backend dùng `AI_SERVICE_BASE_URL=http://ai-service:8000`.

Chi tiết nằm trong `03_BE_AI_INTEGRATION.md`.

### DB-01 - Database

- Chạy migration trong PostgreSQL pgvector.
- Tạo extension, documents, jobs, chunks và indexes.
- Seed hai Teacher, một Admin, course và lecture mẫu.

## 6. API Backend tối thiểu

```txt
POST /api/v1/auth/login

POST /api/v1/lectures/{lectureId}/documents
GET  /api/v1/my/documents
GET  /api/v1/documents/{documentId}
GET  /api/v1/documents/{documentId}/download
GET  /api/v1/document-processing-jobs/{jobId}
POST /api/v1/documents/{documentId}/reprocess
POST /api/v1/documents/{documentId}/submit-review

GET  /api/v1/admin/document-reviews
POST /api/v1/admin/documents/{documentId}/approve
POST /api/v1/admin/documents/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive

GET  /api/v1/library/documents
GET  /api/v1/library/documents/{documentId}
POST /api/v1/rag/answer
```

Backend request/response phải dùng envelope nhất quán với code hiện có.

### 6.1. API quản lý Teacher - Should-have

```txt
GET   /api/v1/admin/teachers
POST  /api/v1/admin/teachers
PATCH /api/v1/admin/teachers/{teacherId}
POST  /api/v1/admin/teachers/{teacherId}/activate
POST  /api/v1/admin/teachers/{teacherId}/deactivate
POST  /api/v1/admin/teachers/{teacherId}/reset-password
```

`GET /api/v1/admin/teachers` hỗ trợ `query`, `status`, `page`, `size`. Tất cả
endpoint trong mục này chỉ cho role `ADMIN`; đối tượng đích luôn là `TEACHER`.

Tạo Teacher:

```json
{
  "name": "Nguyễn Văn A",
  "email": "teacher@example.com",
  "temporary_password": "TempPass123!"
}
```

Cập nhật Teacher chỉ nhận `name`, `email`. Activate/deactivate không nhận role.
Reset password:

```json
{
  "temporary_password": "NewTempPass123!"
}
```

Backend luôn gán role `TEACHER`, BCrypt password và không trả password/hash
trong response.

## 7. Test bắt buộc

### Backend

- Upload hợp lệ tạo Document/job và tự gọi AI.
- Từ chối file sai type, rỗng, quá 20 MB.
- Từ chối lecture không thuộc Teacher.
- AI thành công/thất bại cập nhật đúng status.
- Không có hai active job cho cùng document.
- Chỉ owner submit.
- Chỉ `PROCESSED` được submit.
- Chỉ Admin approve/reject/archive.
- Reject bắt buộc reason.
- Library chỉ trả `PUBLISHED`.
- Backend kiểm quyền mọi `document_id` trước RAG.
- JWT không xuất hiện trong log.

### AI

- Internal key sai bị từ chối.
- Process thật lưu chunks/vector.
- Retrieval không trả chunk ngoài `document_ids`.
- Cosine score đúng thứ tự.
- Citation đúng document/chunk/page.
- Không context trả `not_found`.
- Reprocess rollback khi lỗi.

### Frontend

- Route theo role hoạt động.
- Upload hiển thị polling/status.
- Hai status không bị trộn.
- Approve làm document xuất hiện trong Library.
- Teacher khác không thấy draft.
- Citation hiển thị đúng nguồn.

### E2E gate

```txt
Teacher A login -> upload -> PROCESSED -> submit
-> Admin approve -> Teacher B thấy Library
-> Teacher B hỏi -> answer + citation
```

### Should-have - Quản lý tài khoản Teacher

- Chỉ Admin truy cập được API và màn hình quản lý Teacher.
- Tìm kiếm, lọc trạng thái và phân trang trả đúng kết quả.
- Email Teacher không được trùng.
- Mật khẩu luôn được BCrypt và không xuất hiện trong response.
- Teacher `INACTIVE` không thể đăng nhập.
- Không thể tạo Admin, đổi role hoặc xóa cứng tài khoản qua API.
- UI tạo, sửa, khóa/mở khóa và reset mật khẩu hoạt động đúng.

## 8. Thứ tự merge

1. `refactor(backend): align ids and secure jwt logging`
2. `feat(database): add flyway document and pgvector schema`
3. `chore(docker): add ai service and shared uploads volume`
4. `feat(backend): add document upload and async processing`
5. `feat(ai): verify process-document postgres integration`
6. `feat(backend): add review and publication workflow`
7. `feat(backend): add library APIs`
8. `feat(ai): add document retrieval and rag citations`
9. `feat(backend): add rag proxy and permissions`
10. `feat(frontend): add core teacher and admin flows`
11. `test(e2e): verify publication and rag flow`

Branches:

```txt
feature/mvp-document-backend
feature/mvp-rag-ai
feature/mvp-library-frontend
```

Backend schema merge trước. AI và FE làm song song sau khi contract tương ứng
được khóa. Chỉ một branch sửa Docker Compose tại một thời điểm.

## 9. Kế hoạch 7 ngày

| Ngày | Kết quả bắt buộc |
|---|---|
| 1 | ID Long, Flyway, schema, bỏ log token |
| 2 | Shared volume, upload, Document/job |
| 3 | Backend gọi AI, chunks/vector thật, polling |
| 4 | Submit, approve, reject, archive |
| 5 | Login, Library, My Documents, Admin Review UI |
| 6 | Retrieval, RAG, citation, Backend proxy, RAG UI |
| 7 | E2E, permission, lỗi demo, seed data, đóng scope |

## 10. Definition of Done

- E2E gate chạy được bằng hai Teacher và một Admin.
- Chunks/vector thực sự tồn tại trong PostgreSQL.
- Draft không xuất hiện trong Library.
- RAG chỉ dùng document đã được Backend cho phép.
- Citation đúng document và page.
- Không có token/secret trong log hoặc Frontend bundle.
- Summary/question không chặn core demo.
