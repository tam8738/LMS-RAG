# Kế hoạch triển khai MVP document-centric

**Phiên bản:** 1.5
**Cập nhật:** 07/07/2026
**Mục tiêu:** Demo được luồng Teacher upload tài liệu -> AI analyze nhẹ -> Teacher submit review -> Admin approve -> AI index RAG nếu hỗ trợ -> Library -> RAG citation

## 1. Scope đã khóa

Core MVP tập trung vào quản lý tài liệu/học liệu cho giảng viên. `Document` là trung tâm.

Không làm trong core MVP:

- Student flow.
- Quiz attempt/result.
- Gamification.
- Dashboard thống kê phức tạp.
- Teacher tạo Course/Lecture như LMS.
- Bắt buộc chọn Course/Lecture trước khi upload.
- RAG toàn thư viện không giới hạn scope.
- Summary/question generation trong core demo.

Cách tổ chức tài liệu đúng:

```txt
Document
-> metadata: subject, topic, chapter, tags
-> processing_status
-> publication_status
-> chunks/vector
-> Library/RAG
```

Không dùng hướng cũ:

```txt
Course
-> Lecture
-> Document
```

## 2. Luồng demo bắt buộc

```txt
Teacher A login
-> upload PDF/TXT
-> nhập metadata subject/topic/chapter/tags
-> Backend tạo Document + lưu file
-> Backend tự gọi AI Service ở background
-> AI analyze nhẹ, chưa chunk/embed
-> Admin approve
-> AI index RAG và lưu document_chunks nếu rag_status = READY_TO_INDEX
-> Teacher A submit review
-> Admin approve
-> Document xuất hiện trong Library
-> Teacher B login
-> mở Document trong Library
-> hỏi RAG trên document đó
-> nhận answer + citation đúng nguồn
```

## 3. Current repo snapshot

### Backend hiện có

- Spring Boot project.
- JWT login cơ bản.
- `users` entity/repository/service.
- `UserRole`, `UserStatus`.
- `ApiResponse`, exception handler.
- Một số entity cũ: `Course`, `Lecture`, `CourseMember`.

### Backend chưa có

- Migration chính thức cho schema MVP.
- `Document` entity/service/controller.
- Upload file/shared storage.
- Processing job.
- AI client.
- Admin review API.
- Library API.
- RAG proxy API.
- Teacher management API.

### Frontend hiện có

- Chưa có ứng dụng FE hoàn chỉnh.

### AI Service hiện có

- FastAPI base.
- Storage resolver, file validator.
- PDF/TXT parser.
- Text cleaning/chunking.
- Embedding provider.
- Repository lưu chunks vào pgvector.
- `/v1/process-document` legacy đã có; REF-03/REF-04 đã tách xong `/v1/analyze-document` và `/v1/index-document`.

### Trạng thái AI Service theo scope mới

- Đã bỏ `lecture_id` khỏi schema/code chính.
- `document_chunks` insert theo schema mới không có `lecture_id`.
- Đã thêm retrieval theo `document_ids`.
- Đã thêm `/v1/answer-question`.
- Đã thêm `/v1/analyze-document` để validate/parse nhẹ và estimate trước khi index.

## 4. Task graph tổng quan

```txt
DOCS-01
  -> BE-01 -> BE-02 -> BE-03 -> BE-04 -> BE-05 -> BE-06 -> BE-07
          \          \                                  \
           \          -> AI-01 -> AI-02 -> AI-03          -> INT-02
            \                                             /
             -> FE-01 -> FE-02 -> FE-03 -> FE-04 -> FE-05

INFRA-01 chạy sau BE-02 và AI-01.
QA-01 chạy sau BE-07, FE-05, AI-03, INFRA-01.
```

## 5. Quy ước owner

| Vai trò | Thành viên | Phạm vi chính |
|---|---|---|
| Backend | Tâm | Spring Boot, DB migration, auth, upload, review, Library, RAG proxy |
| Frontend | Việt | React UI, route, API client, screens, state, form, UX demo |
| AI | Khánh | AI Service, parser/chunk/embed/retrieval/RAG, AI docs/handoff |
| Integration | Cả nhóm | Docker, shared volume, E2E demo |

Nếu tên thành viên FE cần ghi đầy đủ hơn, sửa lại trực tiếp trong bảng này.

## 6. Bảng tracking tiến độ task

Quy ước trạng thái:

| Trạng thái | Ý nghĩa |
|---|---|
| `DONE` | Đã hoàn thành và có thể dùng cho demo/tích hợp |
| `IN_PROGRESS` | Đang làm, đã có một phần code hoặc docs |
| `TODO` | Chưa bắt đầu theo scope mới |
| `BLOCKED` | Bị chặn bởi task/phản hồi khác |
| `SHOULD_HAVE` | Không chặn core demo, làm nếu còn thời gian |

### 6.1. Backend tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| BE-01 - Migration/database schema | Tâm | P0 | Docs schema | DONE | Đã thêm Flyway dependency; tạo V1, V2, V3 migration; REF-02 thêm V4 `rag_status` và analysis/index fields; đổi `ddl-auto` sang `validate`; compile + test pass |
| BE-02 - Entity/enum/repository | Tâm | P0 | BE-01 | DONE | Đầy đủ entity `Document`, `DocumentProcessingJob`, enum `ProcessingStatus`/`PublicationStatus`/`DocumentFileType`; REF-02 thêm `RagStatus` và các field analyze/index vào `Document`/`DocumentResponse`; code compile + test pass |
| BE-03 - Upload Document/shared storage | Tâm | P0 | BE-02 | DONE | Upload API `POST /api/v1/documents` dùng multipart file + JSON metadata; validate file type/size/20MB, TEACHER only, lưu file vào `UPLOAD_ROOT/documents/{id}/v1/source.{ext}`, tạo processing job; đã test Docker upload TXT thành công và AI container đọc được file qua shared volume |
| BE-04 - AI analyze client sau upload | Tâm/Khánh | P0 | BE-03, AI-04 | DONE | Đã thêm `AiServiceClient`, config `AI_SERVICE_BASE_URL`/`INTERNAL_API_KEY`; upload gọi AI `/v1/analyze-document`, cập nhật `processing_status`, `rag_status`, analysis fields và job status; backend test pass |
| BE-05 - My Documents API | Tâm | P0 | BE-04 | IN_PROGRESS | Đã có list/detail/update/delete/submit-review; cần expose `rag_status`, analysis result, chỉ submit khi `processing_status=PROCESSED` |
| BE-06 - Admin review API | Tâm/Khánh | P0 | BE-05, AI-05 | DONE | Đã có review queue/detail/approve/reject/archive; approve publish document và gọi AI `/v1/index-document` nếu `rag_status=READY_TO_INDEX`, cập nhật `INDEXING -> READY/FAILED`; backend test pass |
| BE-07 - Library API | Tâm | P0 | BE-06 | IN_PROGRESS | Đã có list/detail chỉ trả `PUBLISHED`; cần expose badge RAG: READY, INDEXING, UNSUPPORTED, FAILED |
| BE-08 - RAG proxy API | Tâm | P0 | BE-07, AI-03 | TODO | Backend chỉ cho hỏi khi `publication_status=PUBLISHED` và `rag_status=READY`, rồi gọi AI `/v1/answer-question` |
| BE-09 - Admin Teacher management | Tâm | P1 | Auth ổn định | SHOULD_HAVE | Không chặn core demo |

### 6.2. Frontend tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| FE-01 - App shell/route guard/API client | Việt | P0 | Auth contract | TODO | Frontend hiện chưa có app hoàn chỉnh |
| FE-02 - Login screen | Việt | P0 | FE-01, Auth API | TODO | Cần redirect theo role |
| FE-03 - Library list/filter | Việt | P0 | FE-01, BE-07 | TODO | Filter theo metadata document |
| FE-04 - Library detail/RAG UI | Việt | P0 | FE-03, BE-08 | TODO | Hiển thị answer + citations |
| FE-05 - My Documents list | Việt | P0 | FE-01, BE-05 | TODO | Hiển thị processing/publication status |
| FE-06 - Upload Document screen | Việt | P0 | FE-05, BE-03 | TODO | Form metadata, không có Course/Lecture select |
| FE-07 - My Document detail | Việt | P0 | FE-05, BE-05 | TODO | Submit/reprocess/edit metadata |
| FE-08 - Admin review queue | Việt | P0 | FE-01, BE-06 | TODO | Chỉ Admin truy cập |
| FE-09 - Admin review detail | Việt | P0 | FE-08, BE-06 | TODO | Approve/reject với reason |
| FE-10 - Admin Teacher management | Việt | P1 | BE-09 | SHOULD_HAVE | Không chặn core demo |

### 6.3. AI tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| AI-01 - Legacy process-document contract | Khánh | P0 | Schema contract | DONE | Endpoint cũ `/v1/process-document` đã chạy được và dùng làm nền cho refactor; từ v1.5 sẽ tách thành analyze/index |
| AI-02 - Retrieval repository theo document_ids | Khánh | P0 | BE-01, AI-01 | DONE | Đã thêm `RetrievedDocumentChunk`, `search_similar_chunks`, query pgvector theo `document_ids`; sẽ dùng khi `rag_status=READY` |
| AI-03 - Answer question endpoint | Khánh | P0 | AI-02 | DONE | Đã thêm `/v1/answer-question`; Backend phải chỉ gọi với document `PUBLISHED + READY` |

| AI-04 - Analyze document endpoint | Khánh | P0 | AI-01 | DONE | Đã thêm `/v1/analyze-document`: validate/parse nhẹ/estimate, trả READY_TO_INDEX hoặc UNSUPPORTED, không ghi chunks; test pass |
| AI-05 - Index document endpoint | Khánh | P0 | AI-04, AI-02 | DONE | Đã thêm `/v1/index-document`: parse/clean/chunk/embed/atomic replace chunks, trả `rag_status=READY` và `chunk_count`; test pass |

### 6.4. Infra, integration và QA tasks

| Task | Owner | Priority | Depends on | Trạng thái | Ghi chú tracking |
|---|---|---:|---|---|---|
| DOCS-01 - Cập nhật docs document-centric | Khánh | P0 | Quyết định scope | DONE | PRD, integration, schema contract, backend DB guide, AI contract, implementation plan đã cập nhật |
| INFRA-01 - Docker/shared volume | Tâm + Khánh | P0 | BE-03, AI-01 | DONE | `docker-compose.yml` đã có `postgres`, `backend`, `ai-service`, `pgadmin`, volume `uploads`; Backend mount `/storage/uploads` read-write, AI mount read-only; đã test cùng một file tồn tại trong cả hai container |
| INT-01 - Backend upload -> AI analyze | Tâm + Khánh | P0 | BE-04, AI-04, INFRA-01 | TODO | Cần test: Backend upload -> AI analyze -> `processing_status=PROCESSED`, `rag_status=READY_TO_INDEX/UNSUPPORTED` |
| INT-02 - Review -> index -> Library -> RAG | Cả nhóm | P0 | BE-06, BE-08, AI-05, FE-09 | TODO | Cần test: Admin approve -> Backend gọi index -> `rag_status=READY` -> Library cho hỏi RAG citation |
| QA-01 - E2E demo rehearsal | Cả nhóm | P0 | INT-02 | TODO | Chạy kịch bản Teacher A/Admin/Teacher B |

### 6.5. Cách cập nhật bảng tracking

Khi hoàn thành một task, người phụ trách cập nhật:

1. Đổi `Trạng thái` sang `IN_PROGRESS`, `DONE` hoặc `BLOCKED`.
2. Ghi ngắn bằng chứng vào `Ghi chú tracking`, ví dụ endpoint đã có, test đã pass, hoặc đang bị chặn bởi task nào.
3. Nếu task đổi contract API/schema, cập nhật docs liên quan trong cùng PR.

### 6.6. Snapshot kiểm thử thực tế 11/07/2026

Môi trường đã kiểm thử:

```txt
docker compose up -d --build ai-service backend
```

Services hoạt động:

```txt
postgres: healthy
backend: up, Flyway validate/migrate OK
ai-service: healthy
```

Các bước đã pass:

1. Backend login bằng seed user `teacher.a@example.com` thành công.
2. Backend upload TXT qua `POST /api/v1/documents` thành công.
3. Snapshot cũ: Document mới tạo có `processing_status=PROCESSING`, `publication_status=DRAFT` và `storage_key=documents/2/v1/source.txt`; sau REF-01 kỳ vọng mới là `ANALYZING -> PROCESSED` và `rag_status=READY_TO_INDEX/UNSUPPORTED`.
4. Backend lưu file vào `/storage/uploads/documents/2/v1/source.txt`.
5. AI container đọc được đúng file này qua shared volume read-only.
6. AI `/v1/health` trả `UP`.
7. AI `/v1/health/pgvector` trả `UP`, database `lms_rag`, pgvector `0.8.2`.
8. Snapshot cũ: gọi trực tiếp AI `POST /v1/process-document` với `document_id=2` trả `PROCESSED`; sau REF-01 thay bằng `analyze-document` rồi `index-document`.
9. Bảng `document_chunks` có row thật cho `document_id=2`.
10. Gọi trực tiếp AI `POST /v1/analyze-document
POST /v1/index-document
POST /v1/answer-question` với `document_ids=[2]` trả answer, `not_found=false` và citation thật.
11. Luồng review/library Backend đã pass khi set `PROCESSED` thủ công: Teacher submit review, Admin approve, Teacher B thấy document trong Library.

Blocker còn lại cho core E2E:

```txt
BE-04 đã có code: Backend upload xong gọi AI /v1/analyze-document và cập nhật processing_status, rag_status, analysis fields/job status.
INT-01 chưa chốt: cần chạy lại Docker E2E thật để xác nhận Backend + AI Service + shared volume hoạt động cùng nhau.
BE-06 đã có code: Backend approve xong gọi AI /v1/index-document nếu rag_status=READY_TO_INDEX và cập nhật READY/FAILED.
BE-08 chưa có: Backend chưa có RAG proxy /api/v1/rag/answer để kiểm quyền rồi gọi AI.
Frontend chưa có app để chạy demo UI.
```
Kết luận snapshot:

```txt
AI Service core đã chạy được với database/file thật.
Docker/shared volume đã chạy được.
Backend document/review/library đã chạy được từng phần.
MVP chưa E2E hoàn chỉnh vì còn thiếu review->index flow, RAG proxy và test Docker E2E sau BE-04.
```


### 6.7. Snapshot REF-02 - Backend schema/model

Đã hoàn thành:

```txt
V4__add_rag_status_and_analysis_fields.sql
RagStatus enum
ProcessingStatus thêm ANALYZING, giữ PROCESSING tạm thời để không gãy flow cũ
Document thêm rag_status và analysis/index fields
DocumentResponse/DocumentMapper expose các field mới
Backend Maven test pass
```

Chưa làm trong REF-02:

```txt
Đã đổi upload flow sang ANALYZING rồi PROCESSED/FAILED theo kết quả analyze
Đã gọi AI /v1/analyze-document sau upload trong BE-04
Đã gọi AI /v1/index-document sau approve trong BE-06
```
## 7. Backend implementation plan

### BE-01 - Chuẩn hóa migration/database schema

- TIP-ID: BE-01
- Owner: Tâm
- Priority: P0
- Depends on: `docs/05_DATABASE_SCHEMA_CONTRACT.md`, `docs/07_BACKEND_DATABASE_SCHEMA_GUIDE.md`
- Concurrency: EXCLUSIVE
- Estimate: 0.5-1 ngày

Việc cần làm:

- Chọn cơ chế migration: ưu tiên Flyway.
- Tạo migration theo thứ tự:

```txt
V1__create_users.sql
V2__create_document_mvp.sql
V3__seed_demo_users.sql
```

- Tạo extension pgvector.
- Tạo các bảng core:

```txt
users
documents
document_processing_jobs
document_chunks
```

- Không tạo dependency mới từ `documents` hoặc `document_chunks` sang `courses/lectures`.
- Giữ `courses/lectures/course_members` cũ nếu đang tồn tại trong code, nhưng không dùng trong MVP flow.
- Cân nhắc đổi `spring.jpa.hibernate.ddl-auto=update` sang `validate` sau khi migration ổn.

Acceptance criteria:

- Database sạch chạy migration thành công.
- `document_chunks.embedding` là `VECTOR(1536)`.
- `documents` có metadata `subject`, `topic`, `chapter`, `tags`.
- Không có `lecture_id` hoặc `course_id` trong `documents`/`document_chunks`.
- Có seed 1 Admin và 2 Teacher demo.

Test/check command:

```powershell
cd backend
./mvnw test
```

SQL check:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Handoff cho AI:

- DB có `documents` và `document_chunks`.
- Có ít nhất một `document_id` thật để test insert chunks.
- pgvector extension đã bật.

### BE-02 - Entity/enum/repository cho Document MVP

- TIP-ID: BE-02
- Owner: Tâm
- Priority: P0
- Depends on: BE-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Tạo/cập nhật:

```txt
Document
DocumentProcessingJob
ProcessingStatus
PublicationStatus
DocumentFileType
DocumentRepository
DocumentProcessingJobRepository
```

Document fields cần khớp contract:

```txt
id
uploadedBy
title
description
subject
topic
chapter
tags
originalFilename
storedFilename
storageKey
fileVersion
fileType
mimeType
fileSize
processingStatus
publicationStatus
errorCode
errorMessage
processedAt
reviewedBy
reviewedAt
rejectionReason
publishedAt
createdAt
updatedAt
```

Không thêm:

```txt
courseId
lectureId
```

Acceptance criteria:

- Entity map đúng schema.
- Enum dùng string, không dùng ordinal.
- Repository query được theo owner, status và Library.
- Code compile.

### BE-03 - Upload Document và shared storage

- TIP-ID: BE-03
- Owner: Tâm
- Priority: P0
- Depends on: BE-02
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày

Endpoint:

```txt
POST /api/v1/documents
Content-Type: multipart/form-data
Authorization: Bearer <JWT>
```

Request fields:

```txt
file: PDF/TXT
title: required
description: optional
subject: optional
topic: optional
chapter: optional
tags: optional array hoặc comma-separated string
```

Backend xử lý:

1. Xác thực Teacher.
2. Validate file extension/MIME/size, max 20 MB.
3. Tạo Document với:

```txt
processing_status = UPLOADED
rag_status = NOT_ANALYZED
publication_status = DRAFT
file_version = 1
```

4. Lưu file dưới:

```txt
UPLOAD_ROOT/documents/{document_id}/v1/source.{extension}
```

5. Lưu `storage_key` dạng relative path:

```txt
documents/{document_id}/v1/source.pdf
```

6. Tạo processing job hoặc publish event để BE-04 xử lý.

Response tối thiểu:

```json
{
  "success": true,
  "data": {
    "id": 12,
    "title": "Bài giảng cơ sở dữ liệu",
    "subject": "Cơ sở dữ liệu",
    "topic": "Chuẩn hóa dữ liệu",
    "chapter": "Chương 3",
    "tags": ["database", "normalization"],
    "processing_status": "UPLOADED",
    "publication_status": "DRAFT",
    "storage_key": "documents/12/v1/source.pdf"
  }
}
```

Acceptance criteria:

- Upload không cần Course/Lecture.
- File được lưu trong shared upload root.
- `storage_key` không phải absolute path.
- File sai loại/quá size trả lỗi rõ.
- Không log JWT, file content, secret.

### BE-04 - AI analyze client sau upload

- TIP-ID: BE-04
- Owner: Tâm/Khánh
- Priority: P0
- Depends on: BE-03, AI-04
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày
- Status: DONE

Tạo/cập nhật:

```txt
AiServiceProperties
AiServiceClient
AI analyze request/response DTO
DocumentService upload analyze integration
application.properties AI config
docker-compose.yml Backend AI env
```

Luồng đã implement:

```txt
Teacher upload
-> Backend lưu file vào shared storage
-> set processing_status = ANALYZING, rag_status = NOT_ANALYZED
-> tạo DocumentProcessingJob job_type = ANALYZE, status = PROCESSING
-> POST AI /v1/analyze-document
-> success: PROCESSED + READY_TO_INDEX/UNSUPPORTED + analyzed_at + analysis fields
-> fail: FAILED + rag_status = FAILED + analysis_error_code/message
```

AI request theo contract v1.5:

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

Headers:

```txt
X-Internal-Key: <INTERNAL_API_KEY>
```

Acceptance criteria:

- MVP hiện gọi analyze đồng bộ ngay sau upload; phù hợp file demo/nhỏ, có thể tách `@Async` sau.
- AI success cập nhật `PROCESSED + READY_TO_INDEX/UNSUPPORTED`.
- AI lỗi cập nhật `FAILED`.
- Tạo `DocumentProcessingJob` loại `ANALYZE`, status `PROCESSING -> PROCESSED/FAILED`.
- Không gửi `lecture_id` hoặc `course_id` sang AI.
- Backend Maven test pass.
- INT-01 vẫn cần Docker E2E để xác nhận Backend + AI + shared volume chạy cùng nhau.
### BE-05 - My Documents API

- TIP-ID: BE-05
- Owner: Tâm
- Priority: P0
- Depends on: BE-04
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày

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

- Chỉ owner xem được document chưa public của mình.
- Owner sửa metadata khi `DRAFT` hoặc `REJECTED`.
- Owner xóa khi `DRAFT` hoặc `REJECTED`.
- Submit review chỉ khi:

```txt
processing_status = PROCESSED
publication_status = DRAFT hoặc REJECTED
```

- Khi submit review:

```txt
publication_status = PENDING_REVIEW
rejection_reason = null nếu submit lại
```

Reprocess:

- Cho phép khi owner và document không ở `PENDING_REVIEW`.
- Nếu thay file, tăng `file_version` và tạo `storage_key` mới.
- Nếu chỉ reprocess file cũ, giữ `storage_key`.

Acceptance criteria:

- Teacher A không xem/sửa/xóa draft của Teacher B.
- Submit khi chưa `PROCESSED` trả lỗi.
- `REJECTED` có thể sửa metadata và submit lại.
- `PUBLISHED` không cho sửa file trong core MVP.

### BE-06 - Admin review API

- TIP-ID: BE-06
- Owner: Tâm/Khánh
- Priority: P0
- Depends on: BE-05, AI-05
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày
- Status: DONE

Endpoints:

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
```

Rules:

- Chỉ role `ADMIN` gọi được.
- Review queue chỉ lấy `PENDING_REVIEW`.
- Approve chỉ từ `PENDING_REVIEW` sang `PUBLISHED`.
- Reject chỉ từ `PENDING_REVIEW` sang `REJECTED` và bắt buộc `reason`.
- Archive chỉ từ `PUBLISHED` sang `ARCHIVED`.

Khi approve đã implement:

```txt
reviewed_by = admin_id
reviewed_at = now
published_at = now
publication_status = PUBLISHED

Nếu rag_status = READY_TO_INDEX:
    tạo DocumentProcessingJob job_type = INDEX
    rag_status = INDEXING
    POST AI /v1/index-document
    success: rag_status = READY, indexed_at = now, chunk_count vào job
    fail: rag_status = FAILED, rag_error_code/message vào document

Nếu rag_status = UNSUPPORTED:
    không gọi index-document
    document vẫn PUBLISHED như tài liệu thường
```

Acceptance criteria:

- Teacher không gọi được admin endpoints.
- Admin approve xong document xuất hiện trong Library.
- Nếu document hỗ trợ RAG thì Backend gọi AI index và cập nhật `READY/FAILED`.
- Nếu document `UNSUPPORTED` thì vẫn publish bình thường, không gọi AI index.
- Admin reject xong Teacher owner thấy lý do.
- `ARCHIVED` không còn trong Library.
- Backend Maven test pass.
### BE-07 - Library API

- TIP-ID: BE-07
- Owner: Tâm
- Priority: P0
- Depends on: BE-06
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Endpoints:

```txt
GET /api/v1/library
GET /api/v1/library/{documentId}
```

Query filters:

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

Rules:

- Chỉ trả `publication_status = PUBLISHED
Nếu rag_status = READY_TO_INDEX thì bắt đầu index RAG`.
- Không trả `DRAFT`, `PENDING_REVIEW`, `REJECTED`, `ARCHIVED`.
- Detail chỉ mở document `PUBLISHED` cho Teacher khác.
- Owner vẫn nên dùng `/my/documents/{id}` cho tài liệu chưa public.

Acceptance criteria:

- Teacher B thấy tài liệu Teacher A đã publish.
- Teacher B không thấy draft/rejected của Teacher A.
- Filter subject/topic/chapter/tags hoạt động ở mức MVP.

### BE-08 - RAG proxy API

- TIP-ID: BE-08
- Owner: Tâm
- Priority: P0
- Depends on: BE-07, AI-03
- Concurrency: EXCLUSIVE
- Estimate: 0.75 ngày

Endpoint:

```txt
POST /api/v1/rag/answer
```

Request:

```json
{
  "document_ids": [12],
  "question": "Chuẩn hóa dữ liệu là gì?",
  "top_k": 5
}
```

Backend xử lý:

1. Validate question/document_ids/top_k.
2. Kiểm permission từng document:
   - Owner được hỏi document của mình nếu `PROCESSED`.
   - Teacher khác chỉ được hỏi document `PUBLISHED`.
3. Gọi AI `/v1/answer-question`.
4. Trả answer/citations về FE.

Acceptance criteria:

- Không gọi AI nếu có document không có quyền.
- Không gửi document chưa `PROCESSED` sang AI.
- Citation trả về FE giữ đủ `document_id`, `page_number`, `chunk_index`, `excerpt`, `score`.

### BE-09 - Admin Teacher management Should-have

- TIP-ID: BE-09
- Owner: Tâm
- Priority: P1
- Depends on: Auth ổn định
- Concurrency: EXCLUSIVE
- Estimate: 0.5-1 ngày

Endpoints:

```txt
GET  /api/v1/admin/teachers
POST /api/v1/admin/teachers
PATCH /api/v1/admin/teachers/{teacherId}
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

Rules:

- Chỉ Admin gọi được.
- Không tạo thêm Admin.
- Không đổi role qua UI.
- Deactivate Teacher không xóa documents.
- Reset password tạo password tạm hoặc nhận password mới theo policy nhóm.

Acceptance criteria:

- Admin tạo Teacher demo được.
- Teacher bị inactive không login được.
- Không làm ảnh hưởng core upload/review/RAG.

## 8. Frontend implementation plan

### FE-01 - Khởi tạo app shell, route guard, API client

- TIP-ID: FE-01
- Owner: Việt
- Priority: P0
- Depends on: Backend auth contract
- Concurrency: SAFE nếu Backend làm song song
- Estimate: 0.75 ngày

Tạo/cập nhật:

```txt
frontend app React + Vite nếu chưa có
src/main.tsx
src/App.tsx
src/routes
src/api/client.ts
src/auth/AuthProvider.tsx
src/auth/ProtectedRoute.tsx
src/layouts/AppLayout.tsx
```

Routes tối thiểu:

```txt
/login
/library
/library/:documentId
/my-documents
/my-documents/upload
/my-documents/:documentId
/admin/reviews
/admin/reviews/:documentId
/admin/teachers
```

Acceptance criteria:

- Login lưu JWT.
- API client tự gắn `Authorization: Bearer <token>`.
- Teacher không vào admin routes.
- Admin vào được admin routes.
- Không gọi AI trực tiếp từ FE.

### FE-02 - Login screen

- TIP-ID: FE-02
- Owner: Việt
- Priority: P0
- Depends on: FE-01, Backend auth
- Concurrency: SAFE
- Estimate: 0.5 ngày

UI:

- Email input.
- Password input.
- Submit button.
- Loading/error state.

Flow:

```txt
POST /api/v1/auth/login
-> save token/user
-> Teacher redirect /library
-> Admin redirect /admin/reviews hoặc /library
```

Acceptance criteria:

- Sai tài khoản hiển thị lỗi rõ.
- Token hết hạn/401 đưa về login.
- Không hiển thị token trong UI/log.

### FE-03 - Library list và filter

- TIP-ID: FE-03
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-07
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/library
```

UI cần có:

- Search box `q`.
- Filter subject/topic/chapter/tags.
- Danh sách document cards/rows.
- Badge subject/status/file type.
- Pagination đơn giản.

API:

```txt
GET /api/v1/library?q=&subject=&topic=&chapter=&tags=&page=&limit=
```

Acceptance criteria:

- Chỉ hiển thị tài liệu published do Backend trả.
- Empty state khi chưa có tài liệu.
- Loading/error state.
- Click document mở `/library/:documentId`.

### FE-04 - Library detail và RAG UI

- TIP-ID: FE-04
- Owner: Việt
- Priority: P0
- Depends on: FE-03, BE-08
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/library/:documentId
```

UI cần có:

- Metadata document: title, description, subject, topic, chapter, tags.
- File info: type, size, uploader, published_at.
- Download/open file button nếu Backend có endpoint file.
- RAG question input.
- Answer panel.
- Citation list.

RAG call:

```txt
POST /api/v1/rag/answer
```

Acceptance criteria:

- Teacher hỏi được trên document đang mở.
- Hiển thị `not_found` tử tế nếu AI không tìm thấy context.
- Citations hiển thị page/chunk/excerpt/score.
- Không cho gửi câu hỏi rỗng.

### FE-05 - My Documents list

- TIP-ID: FE-05
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-05
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/my-documents
```

UI cần có:

- Danh sách tài liệu của Teacher hiện tại.
- Badge `processing_status`.
- Badge `publication_status`.
- Actions theo trạng thái:
  - View detail.
  - Submit review nếu `PROCESSED + DRAFT/REJECTED`.
  - Reprocess nếu failed hoặc cần xử lý lại.
  - Delete nếu được phép.

Acceptance criteria:

- Teacher chỉ thấy tài liệu của mình.
- Status dễ đọc: UPLOADED/ANALYZING/PROCESSED/FAILED, DRAFT/PENDING/PUBLISHED/REJECTED/ARCHIVED và NOT_ANALYZED/READY_TO_INDEX/UNSUPPORTED/INDEXING/READY/FAILED.
- Submit review disabled khi chưa processed.

### FE-06 - Upload Document screen

- TIP-ID: FE-06
- Owner: Việt
- Priority: P0
- Depends on: FE-05, BE-03
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/my-documents/upload
```

Form:

```txt
file PDF/TXT
title
description
subject
topic
chapter
tags
```

Không có:

```txt
course select
lecture select
```

Flow:

```txt
submit multipart
-> redirect /my-documents/{documentId}
-> detail hiển thị ANALYZING/PROCESSED và rag_status
-> user có thể refresh/poll status
```

Acceptance criteria:

- Upload file PDF/TXT thành công.
- File sai loại/quá size hiển thị lỗi.
- Metadata gửi đúng field mới.
- Không có UI yêu cầu tạo/chọn Course/Lecture.

### FE-07 - My Document detail

- TIP-ID: FE-07
- Owner: Việt
- Priority: P0
- Depends on: FE-05, BE-05
- Concurrency: SAFE
- Estimate: 1 ngày

Route:

```txt
/my-documents/:documentId
```

UI cần có:

- Metadata + file info.
- Processing status timeline đơn giản.
- Publication status.
- Error message nếu processing failed.
- Rejection reason nếu rejected.
- Edit metadata form khi allowed.
- Submit review button khi allowed.
- Reprocess button khi allowed.

Acceptance criteria:

- `PENDING_REVIEW` không cho sửa file.
- `REJECTED` hiển thị lý do và cho submit lại sau khi sửa.
- `FAILED` hiển thị lỗi xử lý AI.
- Owner có thể hỏi RAG nếu document `PROCESSED` nếu BE hỗ trợ trong same RAG API.

### FE-08 - Admin review queue

- TIP-ID: FE-08
- Owner: Việt
- Priority: P0
- Depends on: FE-01, BE-06
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/admin/reviews
```

UI cần có:

- List documents `PENDING_REVIEW`.
- Uploader, subject/topic/chapter, submitted time.
- Link detail review.

Acceptance criteria:

- Teacher không vào được.
- Empty state khi không có tài liệu chờ duyệt.
- Click mở `/admin/reviews/:documentId`.

### FE-09 - Admin review detail

- TIP-ID: FE-09
- Owner: Việt
- Priority: P0
- Depends on: FE-08, BE-06
- Concurrency: SAFE
- Estimate: 0.75 ngày

Route:

```txt
/admin/reviews/:documentId
```

UI cần có:

- Document metadata.
- File info/download/open.
- Processing status.
- Approve button.
- Reject button + reason input.

Acceptance criteria:

- Approve chuyển document sang published và quay về queue/list.
- Reject bắt buộc nhập reason.
- Sau approve, document xuất hiện trong Library.

### FE-10 - Admin Teacher management Should-have

- TIP-ID: FE-10
- Owner: Việt
- Priority: P1
- Depends on: BE-09
- Concurrency: SAFE
- Estimate: 0.5-1 ngày

Route:

```txt
/admin/teachers
```

UI tối thiểu:

- List/search Teacher.
- Create Teacher form.
- Activate/deactivate buttons.
- Reset password action.

Acceptance criteria:

- Không có UI tạo Admin.
- Không có UI đổi role.
- Inactive Teacher hiển thị rõ.

## 9. AI implementation plan

### AI-01 - Legacy process-document và nền pipeline

- Owner: Khánh
- Priority: P0
- Depends on: BE schema contract
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Việc cần làm:

- Bỏ `lecture_id` khỏi request/response schema nếu còn.
- Optional `metadata` gồm subject/topic/chapter/tags.
- Repository insert `document_chunks` không insert `lecture_id`.
- Tests cập nhật theo payload mới.

Acceptance criteria:

- `/v1/process-document` nhận payload không có `lecture_id`.
- Process PDF/TXT vẫn tạo chunks/embeddings.
- Unit/API tests pass.

### AI-02 - Retrieval repository theo document_ids

- Owner: Khánh
- Priority: P0
- Depends on: BE-01 schema, AI-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày
- Status: DONE

Việc đã làm:

- Thêm model `RetrievedDocumentChunk` cho kết quả retrieval/citation.
- Thêm interface `search_similar_chunks(document_ids, query_embedding, top_k)`.
- Query vector trong `document_chunks` theo `document_ids` bằng pgvector cosine distance.
- Deduplicate `document_ids`, validate `top_k`, vector dimensions và NaN/Infinity trước khi mở DB.
- Trả `chunk_id`, `document_id`, `page_number`, `chunk_index`, `content`, `token_count`, `distance`, `score`.
- Không query toàn Library và không tự kiểm permission trong AI Service.

Acceptance criteria:

- Không rò chunks của document ngoài scope.
- Có mock test với nhiều document.
- `pytest tests/test_document_chunk_repository.py` pass 14 tests.

### AI-03 - Answer question endpoint

- Owner: Khánh
- Priority: P0
- Depends on: AI-02
- Concurrency: EXCLUSIVE
- Estimate: 1 ngày
- Status: DONE

Endpoint:

```txt
POST /v1/analyze-document
POST /v1/index-document
POST /v1/answer-question
```

Việc đã làm:

- Thêm schema `AnswerQuestionRequest`, `AnswerQuestionResult`, `AnswerCitation`.
- Thêm service `AnswerQuestionService` để embed câu hỏi, gọi `search_similar_chunks` và format kết quả.
- Thêm route `/v1/answer-question` có `X-Internal-Key` giống các internal API khác.
- Trả `not_found=true` nếu retrieval không có chunk.
- Trả citations dựa trên row thật từ `document_chunks`, không tạo citation giả.
- MVP hiện dùng extractive answer từ retrieved chunks; chưa thêm LLM generation/chat provider.

Response có:

```txt
answer
not_found
citations[]
tokens_used
```

Citation fields:

```txt
chunk_id
document_id
page_number
chunk_index
excerpt
score
```

Acceptance criteria:

- Không có context thì `not_found=true`.
- Answer chỉ dựa trên retrieved context.
- Không tạo citation giả.
- Internal key sai trả 401.
- `pytest tests/test_answer_question_api.py tests/test_process_document_api.py tests/test_document_chunk_repository.py` pass 35 tests.

### AI-04 - Analyze document endpoint

- Owner: Khánh
- Priority: P0
- Depends on: AI-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày
- Status: DONE

Endpoint:

```txt
POST /v1/analyze-document
```

Việc đã làm:

- Thêm schema `AnalyzeDocumentRequest` và `AnalyzeDocumentResult`.
- Thêm service `AnalyzeDocumentService` để resolve `storage_key`, validate file, parse/chunk nhẹ và estimate số trang/token/chunk.
- Thêm route `/v1/analyze-document` có `X-Internal-Key` giống các internal API khác.
- Nếu tài liệu đọc được text thì trả `processing_status=PROCESSED`, `rag_status=READY_TO_INDEX`.
- Nếu tài liệu rỗng/không có text layer thì trả `processing_status=PROCESSED`, `rag_status=UNSUPPORTED`, `unsupported_reason=EMPTY_DOCUMENT`.
- Endpoint này không sinh embedding và không ghi `document_chunks`; phần đó để cho AI-05 `/v1/index-document`.

Response có:

```txt
document_id
status
rag_status
rag_supported
page_count
estimated_token_count
estimated_chunk_count
unsupported_reason
```

Code liên quan:

```txt
ai-service/app/schemas/analyze_document.py
ai-service/app/services/analyze_document_service.py
ai-service/app/api/routes/analyze_document.py
ai-service/app/api/dependencies.py
ai-service/app/api/router.py
ai-service/tests/test_analyze_document_api.py
```

Acceptance criteria:

- File PDF/TXT có text trả `READY_TO_INDEX`.
- File rỗng hoặc PDF scan không text trả `UNSUPPORTED`, không coi là lỗi hệ thống.
- Không ghi chunks/vector trong bước analyze.
- Internal key sai trả 401.
- Payload thiếu/sai field trả validation error.
- `pytest tests/test_analyze_document_api.py` pass 6 tests.
- `pytest tests/test_analyze_document_api.py tests/test_process_document_api.py tests/test_answer_question_api.py tests/test_document_chunk_repository.py` pass 41 tests.

### AI-05 - Index document endpoint

- Owner: Khánh
- Priority: P0
- Depends on: AI-04, AI-02
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày
- Status: DONE

Endpoint:

```txt
POST /v1/index-document
```

Việc đã làm:

- Thêm schema `IndexDocumentRequest` và `IndexDocumentResult`.
- Thêm service `IndexDocumentService` để bọc pipeline xử lý đầy đủ hiện có.
- Endpoint `/v1/index-document` tái sử dụng `ProcessDocumentService`: resolve file, validate, parse, clean/chunk, embed và atomic replace chunks trong `document_chunks`.
- Response trả `rag_status=READY`, `page_count`, `chunk_count` để Backend cập nhật document sau khi index thành công.
- Endpoint này không tự cập nhật bảng `documents`; Backend vẫn là owner của status `INDEXING/READY/FAILED`.
- Endpoint legacy `/v1/process-document` vẫn giữ để backward compatibility/test cũ.

Response có:

```txt
document_id
rag_status
page_count
chunk_count
```

Code liên quan:

```txt
ai-service/app/schemas/index_document.py
ai-service/app/services/index_document_service.py
ai-service/app/api/routes/index_document.py
ai-service/app/api/dependencies.py
ai-service/app/api/router.py
ai-service/tests/test_index_document_api.py
```

Acceptance criteria:

- Backend gọi được `/v1/index-document` bằng `X-Internal-Key`.
- Request không còn `lecture_id`; nếu gửi field legacy thì bị reject theo `extra=forbid`.
- `reindex=true` được map sang `reprocess=true` trong pipeline cũ để replace chunks.
- Pipeline lỗi thì trả error envelope theo contract chung.
- Thành công trả `rag_status=READY` và số chunk đã lưu.
- `pytest tests/test_index_document_api.py` pass 6 tests.
- `pytest tests/test_analyze_document_api.py tests/test_index_document_api.py tests/test_process_document_api.py tests/test_answer_question_api.py tests/test_document_chunk_repository.py` pass 47 tests.
## 10. Infra/Docker/shared volume

### INFRA-01 - Docker compose tích hợp Backend + AI + PostgreSQL

- Owner: Tâm + Khánh
- Priority: P0
- Depends on: BE-03, AI-01
- Concurrency: EXCLUSIVE
- Estimate: 0.5 ngày

Cần có:

```txt
postgres
backend
ai-service
frontend optional
pgadmin optional
uploads named volume
```

Mount:

```txt
backend:/storage/uploads read-write
ai-service:/storage/uploads read-only
```

Env:

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

Acceptance criteria:

- Backend container lưu file vào uploads.
- AI container đọc được file đó bằng `storage_key`.
- Backend gọi được AI bằng service name.
- PostgreSQL có pgvector.

## 11. Backend public API contract tối thiểu

### Auth

```txt
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Login response nên có:

```json
{
  "success": true,
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "user": {
      "id": 2,
      "email": "teacher.a@example.com",
      "name": "Teacher A",
      "role": "TEACHER"
    }
  },
  "message": "Đăng nhập thành công"
}
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

### Admin

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

### DocumentView DTO

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

## 12. Permission matrix

| Publication status | Owner Teacher | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem/sửa/xóa/reprocess/submit nếu processed | Không | Không cần |
| `PENDING_REVIEW` | Xem | Không | Xem/approve/reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem/archive |
| `REJECTED` | Xem lý do/sửa/xóa/reprocess/submit lại | Không | Xem |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

## 13. Test gates bắt buộc

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

Docker/E2E:

```powershell
docker compose up -d postgres backend ai-service
```

Manual E2E checklist:

- [ ] Teacher A login.
- [ ] Teacher A upload PDF/TXT không chọn Course/Lecture.
- [ ] Document có metadata subject/topic/chapter/tags.
- [ ] Backend gọi AI analyze và document chuyển `PROCESSED + READY_TO_INDEX/UNSUPPORTED`.
- [ ] Sau Admin approve, AI index và `document_chunks` có rows theo `document_id`.
- [ ] Teacher A submit review.
- [ ] Admin approve.
- [ ] Teacher B thấy document trong Library.
- [ ] Teacher B hỏi RAG và nhận citation.
- [ ] Teacher B không thấy draft/rejected của Teacher A.

## 14. Handoff checklist giữa thành viên

### Backend -> AI

- [ ] DB có bảng `documents` và `document_chunks` theo schema v1.5.
- [ ] `document_chunks` không có `lecture_id`.
- [ ] Shared file tồn tại trong uploads.
- [ ] `storage_key` đúng format `documents/{id}/v1/source.pdf`.
- [ ] Backend gửi payload AI không có `lecture_id`.
- [ ] `INTERNAL_API_KEY` thống nhất.

### AI -> Backend

- [x] `/v1/analyze-document` trả `document_id`, `status`, `rag_status`, `page_count`, estimate.
- [x] `/v1/index-document` trả `document_id`, `rag_status`, `chunk_count`.
- [x] `/v1/answer-question` trả `answer`, `not_found`, `citations`.
- [ ] Error codes theo contract.
- [ ] Retrieval chỉ theo `document_ids`.

### Backend -> Frontend

- [ ] Auth endpoints ổn định.
- [ ] DocumentView DTO thống nhất.
- [ ] Upload endpoint không yêu cầu Course/Lecture.
- [ ] Status transition rõ ràng.
- [ ] Error response đủ để FE hiển thị.

### Frontend -> Backend

- [ ] FE gửi đúng field metadata mới.
- [ ] FE không gửi `course_id` hoặc `lecture_id`.
- [ ] FE không gọi AI trực tiếp.
- [ ] FE có screenshot/recording demo nếu cần báo cáo.

## 15. Thứ tự làm trong 7 ngày

### Ngày 1

- BE-01: migration/schema.
- BE-02: entity/repository.
- FE-01: app shell/API client/route guard.
- AI-01: align contract bỏ `lecture_id`.

### Ngày 2

- BE-03: upload/shared storage.
- BE-04: AI client/background worker.
- FE-02: login.
- FE-06: upload screen bắt đầu.

### Ngày 3

- BE-05: My Documents.
- FE-05: My Documents list.
- FE-07: My Document detail.
- INFRA-01: Docker shared volume lần 1.

### Ngày 4

- BE-06: Admin review.
- FE-08/FE-09: Admin review UI.
- AI-02: retrieval repository.

### Ngày 5

- BE-07: Library.
- BE-08: RAG proxy.
- FE-03/FE-04: Library + RAG UI.
- AI-03: answer-question endpoint.

### Ngày 6

- Tích hợp E2E.
- Fix lỗi status/permission/storage.
- Kiểm tra citation.
- Chuẩn bị dữ liệu demo.

### Ngày 7

- Chạy demo rehearsal.
- Ghi lại lỗi còn lại.
- Chốt scope Should-have nào bỏ.
- Chuẩn bị báo cáo tiến độ.

## 16. Thứ tự commit/branch đề xuất

Branch:

```txt
feature/document-centric-backend
feature/document-centric-frontend
feature/document-centric-ai
feature/document-centric-integration
```

Commit order gợi ý:

```txt
docs: expand document centric implementation plan
feat(backend): add document mvp migration
feat(backend): add document upload and processing worker
feat(ai): align document processing contract
feat(ai): add document retrieval and rag answer
feat(backend): add review library and rag proxy
feat(frontend): add auth and document routes
feat(frontend): add upload library review and rag screens
test(e2e): verify document publication and rag citation
```

## 17. Definition of Done

MVP đạt khi:

- Không còn bước bắt buộc tạo/chọn Course/Lecture trong demo.
- Teacher upload tài liệu và gắn metadata.
- AI tự động analyze tài liệu sau upload.
- Chunks/vector được lưu theo `document_id`.
- Teacher submit review được sau khi processed.
- Admin approve được.
- Document published xuất hiện trong Library.
- Sau Admin approve, tài liệu được index RAG nếu hỗ trợ; Teacher khác hỏi RAG trên document READY và nhận citation.
- Backend/AI/Frontend có test hoặc manual test evidence tối thiểu.
