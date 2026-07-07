# Kế hoạch triển khai MVP document-centric

**Phiên bản:** 1.4
**Cập nhật:** 07/07/2026
**Mục tiêu:** Demo được luồng upload -> AI process -> review -> publish -> Library -> RAG citation

## 1. Nguyên tắc khóa scope

- `Document` là trung tâm của hệ thống.
- `Subject`, `topic`, `chapter`, `tags` chỉ là metadata của Document.
- Không bắt Teacher tạo Course/Lecture trước khi upload.
- Không triển khai Student flow, quiz attempt/result, gamification hoặc dashboard phức tạp.
- Summary/question generation là Should-have, không chặn core demo.
- Admin là actor phụ: duyệt tài liệu và quản lý Teacher ở mức cơ bản nếu còn thời gian.

## 2. Current repo snapshot

Backend hiện có:

- Spring Boot project.
- JWT login/auth base.
- Entity nền như `User`.
- Một số dấu vết LMS cũ như `Course`, `Lecture`, `CourseMember`.

Backend chưa có:

- Document entity/controller/service theo contract mới.
- Upload file và shared storage.
- Processing job.
- Admin review API.
- Library API.
- RAG proxy API.
- Migration Flyway/Liquibase chính thức cho Document MVP.

Frontend hiện có:

- Chưa có source ứng dụng hoàn chỉnh.

AI Service hiện có:

- FastAPI base.
- Internal key dependency.
- Storage resolver, validator, PDF/TXT parser.
- Clean/chunk pipeline.
- OpenAI/mock embedding provider.
- pgvector repository atomic replace.
- `POST /v1/process-document` theo hướng xử lý tài liệu.

AI Service chưa có:

- Contract v1.4 bỏ `lecture_id` trong code nếu code hiện còn field này.
- Retrieval theo `document_ids`.
- RAG answer endpoint.
- Docker compose tích hợp chung với Backend.

## 3. MVP flow cần demo

```txt
Teacher login
-> upload PDF/TXT
-> nhập metadata subject/topic/chapter/tags
-> Backend tạo Document
-> AI process chunks/vector
-> Teacher submit review
-> Admin approve
-> document xuất hiện trong Library
-> Teacher khác mở document
-> hỏi RAG trên document đó
-> nhận answer + citation
```

## 4. Backend schema/migration cần tạo

Migration đề xuất:

```txt
V1__baseline_auth_schema.sql
V2__add_document_mvp_schema.sql
V3__seed_mvp_demo_users.sql
```

`V2__add_document_mvp_schema.sql` phải bám `docs/05_DATABASE_SCHEMA.md`:

- `documents`
- `document_processing_jobs`
- `document_chunks`
- pgvector extension
- indexes cho owner/status/library/tags/vector

Quy tắc quan trọng:

- Không FK `documents` sang `courses` hoặc `lectures`.
- Không lưu `lecture_id` trong `document_chunks`.
- Metadata nằm ở `documents.subject`, `documents.topic`, `documents.chapter`, `documents.tags`.
- Nếu repo giữ bảng `courses/lectures` cũ, không dùng chúng trong MVP flow mới.

## 5. Backend entity/enum/repository/service/controller

### BE-01 - Document domain

Owner: Tâm
Estimate: 0.5 ngày
Phụ thuộc: migration

Tạo/cập nhật:

- `Document`
- `DocumentProcessingJob`
- `ProcessingStatus`: `UPLOADED`, `PROCESSING`, `PROCESSED`, `FAILED`
- `PublicationStatus`: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `ARCHIVED`
- `FileType`: `PDF`, `TXT`
- `DocumentRepository`
- `DocumentProcessingJobRepository`

Acceptance:

- Entity khớp schema v1.4.
- Không còn field bắt buộc `courseId`/`lectureId` trong Document MVP.
- Có audit fields `created_at`, `updated_at`, `processed_at`, `reviewed_at`, `published_at`.

### BE-02 - Upload và storage

Owner: Tâm
Estimate: 1 ngày
Phụ thuộc: BE-01

Endpoint:

```txt
POST /api/v1/documents
Content-Type: multipart/form-data
```

Form fields:

```txt
file: PDF/TXT
metadata: JSON hoặc form fields gồm title, description, subject, topic, chapter, tags
```

Backend xử lý:

- Xác thực Teacher.
- Validate file type/size.
- Tạo `Document` với `UPLOADED + DRAFT`.
- Lưu file theo `documents/{document_id}/v1/source.{extension}`.
- Tạo processing job.
- Trigger AI processing sau commit.

Acceptance:

- Upload không cần Course/Lecture.
- Response trả `document_id`, metadata, statuses, `storage_key`.
- File nằm dưới `UPLOAD_ROOT`.
- Không log JWT/secret.

### BE-03 - Auto process worker

Owner: Tâm
Estimate: 1 ngày
Phụ thuộc: BE-02, AI-01

Implement:

- `@TransactionalEventListener(AFTER_COMMIT)`.
- `@Async` worker gọi AI.
- Timeout cấu hình được.
- Update `documents.processing_status` và `document_processing_jobs.status`.

Request AI phải theo `docs/04_AI_API_CONTRACT.md`, không gửi `lecture_id`.

Acceptance:

- Upload trả response nhanh, không chờ xử lý lâu trong HTTP request chính.
- AI success -> `PROCESSED`.
- AI error/timeout -> `FAILED` và lưu `error_code/error_message`.
- Không có hai active processing job cho cùng document.

### BE-04 - My Documents

Owner: Tâm
Estimate: 0.5 ngày
Phụ thuộc: BE-01

Endpoints:

```txt
GET    /api/v1/my/documents
GET    /api/v1/my/documents/{documentId}
PATCH  /api/v1/my/documents/{documentId}
DELETE /api/v1/my/documents/{documentId}
POST   /api/v1/my/documents/{documentId}/reprocess
POST   /api/v1/my/documents/{documentId}/submit-review
```

Rules:

- Owner chỉ sửa metadata/file khi `DRAFT` hoặc `REJECTED`.
- Submit review chỉ khi `processing_status = PROCESSED`.
- Không cho submit khi `FAILED/PROCESSING/UPLOADED`.
- Delete chỉ cho owner và khi chưa `PUBLISHED`.

Acceptance:

- Permission đúng owner.
- Metadata update không làm lệch chunks; nếu thay file thì phải reprocess.
- Submit chuyển `DRAFT/REJECTED -> PENDING_REVIEW`.

### BE-05 - Admin review

Owner: Tâm
Estimate: 0.75 ngày
Phụ thuộc: BE-04

Endpoints:

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
```

Rules:

- Chỉ Admin gọi được.
- Approve chỉ từ `PENDING_REVIEW` sang `PUBLISHED`.
- Reject chỉ từ `PENDING_REVIEW` sang `REJECTED`, bắt buộc lý do.
- Archive chỉ từ `PUBLISHED` sang `ARCHIVED`.

Acceptance:

- Lưu `reviewed_by`, `reviewed_at`, `rejection_reason`, `published_at` đúng lúc.
- Library chỉ thấy document đã approve.

### BE-06 - Library và RAG proxy

Owner: Tâm
Estimate: 1 ngày
Phụ thuộc: BE-05, AI-03

Endpoints:

```txt
GET  /api/v1/library
GET  /api/v1/library/{documentId}
POST /api/v1/rag/answer
```

Library filter:

```txt
q
subject
topic
chapter
tags
uploaded_by
page
limit
```

RAG request:

```json
{
  "document_ids": [12],
  "question": "Chuẩn hóa dữ liệu là gì?",
  "top_k": 5
}
```

Rules:

- Teacher khác chỉ thấy `PUBLISHED`.
- Owner có thể RAG tài liệu của mình nếu `PROCESSED`, kể cả chưa published.
- Backend kiểm quyền từng `document_id` trước khi gọi AI.

Acceptance:

- Không rò draft/rejected/archived trong Library.
- AI chỉ nhận document IDs đã được Backend kiểm quyền.
- Response trả answer + citations.

### BE-07 - Admin Teacher management Should-have

Owner: Tâm
Estimate: 0.5-1 ngày
Phụ thuộc: Auth ổn định

Endpoints tối thiểu nếu còn thời gian:

```txt
GET  /api/v1/admin/teachers
POST /api/v1/admin/teachers
PATCH /api/v1/admin/teachers/{teacherId}
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

Rules:

- Không tạo thêm Admin.
- Không đổi role qua UI.
- Deactivate chặn login nhưng không xóa document.

## 6. AI Service endpoint/retrieval cần làm

### AI-01 - Cập nhật process contract v1.4

Owner: Khánh
Estimate: 0.5 ngày

Việc cần làm:

- Bỏ `lecture_id` khỏi request/response schema nếu code hiện còn.
- Chấp nhận optional `metadata` nhưng không dùng để phân quyền.
- Repository insert `document_chunks` không insert `lecture_id`.
- Test process-document theo payload mới.

Acceptance:

- `POST /v1/process-document` chạy với payload chỉ có `document_id`, `storage_key`, `file_type`, `reprocess`, `metadata` optional.
- Unit/API tests cập nhật xanh.

### AI-02 - Retrieval repository

Owner: Khánh
Estimate: 0.5 ngày
Phụ thuộc: schema v1.4

Việc cần làm:

- Query vector theo `document_ids`.
- Join `documents` để lấy title/subject/topic/chapter nếu cần trả citation context.
- Không query toàn Library.
- Không nhận subject/topic/chapter làm permission scope.

Acceptance:

- Query chỉ trả chunks thuộc `document_ids`.
- Có test không rò chunk document khác.

### AI-03 - Answer question endpoint

Owner: Khánh
Estimate: 1 ngày
Phụ thuộc: AI-02

Endpoint:

```txt
POST /v1/answer-question
```

Việc cần làm:

- Validate internal key.
- Validate `document_ids`, `question`, `top_k`, `language`.
- Embed question.
- Retrieve top chunks.
- Nếu không có context -> `not_found=true`.
- Sinh answer bám context.
- Trả citations gồm `chunk_id`, `document_id`, `page_number`, `chunk_index`, `excerpt`, `score`.

Acceptance:

- Có mock test cho retrieval/generation.
- Không citation giả.
- Không dùng kiến thức ngoài context.

### AI-04 - Docker/env integration

Owner: Khánh + Tâm
Estimate: 0.5 ngày

Việc cần làm:

- Thêm Dockerfile/service nếu chưa có.
- Dùng chung `UPLOAD_ROOT`.
- AI mount uploads read-only.
- Cùng `INTERNAL_API_KEY` với Backend.

Acceptance:

- Backend container gọi được AI container.
- AI đọc được file Backend lưu.

## 7. Frontend screens/component cần làm

Owner: Việt

### FE-01 - Auth shell

Routes:

```txt
/login
```

Acceptance:

- Login lưu JWT.
- Route guard Teacher/Admin.
- Không gọi AI trực tiếp.

### FE-02 - Library

Routes:

```txt
/library
/library/:documentId
```

UI:

- Danh sách tài liệu `PUBLISHED`.
- Filter theo subject/topic/chapter/tags/từ khóa.
- Detail hiển thị metadata, owner, file info, citation/RAG area.

Acceptance:

- Không hiển thị draft/rejected/archived.
- Teacher hỏi RAG từ detail document.

### FE-03 - My Documents

Routes:

```txt
/my-documents
/my-documents/upload
/my-documents/:documentId
```

UI:

- Upload PDF/TXT.
- Metadata form: title, description, subject, topic, chapter, tags.
- Status badges: processing/publication.
- Actions: reprocess, submit review, edit metadata, delete khi được phép.

Acceptance:

- Upload không có bước chọn Course/Lecture.
- Submit review bị disable nếu chưa `PROCESSED`.

### FE-04 - Admin Review

Routes:

```txt
/admin/reviews
/admin/reviews/:documentId
```

UI:

- Queue `PENDING_REVIEW`.
- Metadata/file preview/link.
- Approve/reject with reason.
- Archive published document nếu có màn phù hợp.

Acceptance:

- Chỉ Admin thấy route.
- Reject bắt buộc reason.

### FE-05 - Admin Teachers Should-have

Routes:

```txt
/admin/teachers
```

UI tối thiểu:

- List/search Teacher.
- Create Teacher.
- Activate/deactivate.
- Reset password.

## 8. Docker/shared volume/env cần sửa

`docker-compose.yml` mục tiêu:

```txt
postgres
backend
ai-service
frontend nếu cần
pgadmin optional
uploads named volume
```

Mount:

```txt
backend:/storage/uploads read-write
ai-service:/storage/uploads read-only
```

Env tối thiểu:

```txt
UPLOAD_ROOT=/storage/uploads
AI_SERVICE_BASE_URL=http://ai-service:8000
INTERNAL_API_KEY=dev-internal-secret
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
MAX_FILE_SIZE_MB=20
```

## 9. API contract Backend tối thiểu

Envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

`message` optional; FE dùng HTTP status, `success`, `data`, `error.code`.

### Auth

```txt
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Documents

```txt
POST   /api/v1/documents
GET    /api/v1/my/documents
GET    /api/v1/my/documents/{documentId}
PATCH  /api/v1/my/documents/{documentId}
DELETE /api/v1/my/documents/{documentId}
POST   /api/v1/my/documents/{documentId}/reprocess
POST   /api/v1/my/documents/{documentId}/submit-review
```

`DocumentView` tối thiểu:

```json
{
  "id": 12,
  "title": "Bài giảng cơ sở dữ liệu",
  "description": "Tài liệu nhập môn",
  "subject": "Cơ sở dữ liệu",
  "topic": "Chuẩn hóa dữ liệu",
  "chapter": "Chương 3",
  "tags": ["database", "normalization"],
  "file_type": "PDF",
  "file_size": 1200000,
  "storage_key": "documents/12/v1/source.pdf",
  "processing_status": "PROCESSED",
  "publication_status": "PUBLISHED",
  "uploaded_by": 2,
  "uploader_name": "Teacher A",
  "reviewed_by": 1,
  "reviewer_name": "Admin",
  "reviewed_at": "2026-07-07T10:00:00Z",
  "published_at": "2026-07-07T10:00:00Z",
  "created_at": "2026-07-07T09:30:00Z"
}
```

### Admin review

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
```

### Library/RAG

```txt
GET  /api/v1/library
GET  /api/v1/library/{documentId}
POST /api/v1/rag/answer
```

## 10. Permission rule cụ thể

| Status | Owner Teacher | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem/sửa/xóa/reprocess/submit nếu processed | Không | Không cần |
| `PENDING_REVIEW` | Xem | Không | Xem/approve/reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem/archive |
| `REJECTED` | Xem/sửa/xóa/reprocess/submit lại | Không | Xem |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

## 11. Test case bắt buộc

Backend:

```powershell
cd backend
./mvnw test
```

AI:

```powershell
cd ai-service
pytest
python scripts/check_pgvector.py
```

Frontend:

```powershell
cd frontend
npm run build
npm test
```

E2E manual/demo:

1. Teacher A login.
2. Upload PDF/TXT với metadata subject/topic/chapter/tags.
3. Xác nhận Document chuyển `PROCESSING -> PROCESSED`.
4. Submit review.
5. Admin approve.
6. Teacher B thấy document trong Library.
7. Teacher B hỏi RAG và nhận citation đúng document/page/chunk.
8. Teacher B không thấy draft/rejected của Teacher A.
9. AI không nhận `lecture_id` trong request.
10. `document_chunks` lưu đúng `document_id`, không có `lecture_id`.

## 12. Handoff checklist

### Backend -> AI

- [ ] Payload `/v1/process-document` theo contract v1.4.
- [ ] File thật nằm trong shared uploads.
- [ ] `storage_key` đúng format `documents/{id}/v1/source.pdf`.
- [ ] Database có schema `document_chunks` không còn `lecture_id`.
- [ ] Cùng `INTERNAL_API_KEY`.

### AI -> Backend

- [ ] Response process trả `document_id`, `status`, `page_count`, `chunk_count`.
- [ ] Error code đúng contract.
- [ ] `/v1/answer-question` trả answer/citations/not_found.
- [ ] Retrieval chỉ dùng `document_ids`.

### Backend -> Frontend

- [ ] Public API trả DocumentView có metadata.
- [ ] Status transition rõ ràng.
- [ ] Endpoint upload không yêu cầu Course/Lecture.
- [ ] Error code đủ để FE hiển thị.

## 13. Thứ tự commit/branch đề xuất

Branch đề xuất:

```txt
feature/document-centric-backend
feature/document-centric-ai
feature/document-centric-frontend
```

Commit order:

1. `docs: align mvp with document centric metadata`
2. `feat(backend): add document schema and upload metadata`
3. `feat(ai): align process document contract with metadata`
4. `feat(ai): add document retrieval and rag answer`
5. `feat(backend): add review library and rag proxy`
6. `feat(frontend): add document library and upload flow`
7. `test(e2e): verify document publication and rag citation`

## 14. Definition of Done

MVP được coi là đạt khi:

- Không còn bước bắt buộc tạo/chọn Course/Lecture trong demo.
- Upload tài liệu tạo Document và AI tự xử lý.
- Chunks/vector được lưu theo `document_id`.
- Admin approve xong tài liệu xuất hiện trong Library.
- Teacher khác hỏi RAG trên document và nhận citation.
- Tests tối thiểu của Backend, AI, Frontend chạy được hoặc có ghi chú rõ phần chưa chạy.