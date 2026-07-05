# Kế hoạch triển khai MVP theo thành viên

**Phiên bản:** 1.3
**Cập nhật:** 05/07/2026
**Thời gian thực hiện:** 05/07/2026 - 11/07/2026
**Mục tiêu:** Hoàn thành flow Teacher upload -> AI process -> Admin review ->
Library -> document-scoped RAG có citation.

## 1. Cách sử dụng tài liệu

Đây là tài liệu điều phối triển khai duy nhất cho core MVP. Mỗi thành viên đọc:

1. Phạm vi và Definition of Done.
2. Task được gán cho mình.
3. Dependency, contract và handoff liên quan.
4. Acceptance criteria và test command trước khi báo hoàn thành.

Khi tài liệu này khác với:

- Nghiệp vụ: ưu tiên `01_PROJECT_PRD.md`.
- Backend - AI payload: ưu tiên `04_AI_API_CONTRACT.md`.
- Database: ưu tiên `05_DATABASE_SCHEMA.md`.
- Kiến trúc tích hợp: ưu tiên `03_BE_AI_INTEGRATION.md`.

Không tự đổi contract trong lúc implement. Thay đổi contract phải được cả ba thành
viên xác nhận và cập nhật docs trước khi sửa code.

## 2. Kết quả cuối cùng

Core MVP phải demo được:

```txt
Teacher A login
-> chọn lecture và upload PDF/TXT
-> Backend tạo Document + processing job
-> Backend tự gọi AI bằng storage_key
-> AI parse, clean, chunk, embedding và lưu pgvector
-> Backend cập nhật PROCESSED
-> Teacher A submit review
-> Admin approve
-> document xuất hiện trong Library
-> Teacher B mở document
-> Teacher B hỏi trên document đó
-> nhận answer + citation đúng document/page
```

### Must-have

- Login cho Teacher và Admin.
- Upload PDF/TXT tối đa 20 MB.
- Hai trạng thái độc lập: processing và publication.
- Xử lý tự động sau upload, không dùng queue.
- Review, reject, approve, archive.
- Library chỉ hiển thị `PUBLISHED`.
- RAG theo một hoặc nhiều `document_ids`, core UI dùng một document.
- Permission được kiểm tại Backend.
- Test tích hợp thực với PostgreSQL/pgvector và shared volume.

### Should-have sau core

- Admin quản lý tài khoản Teacher cơ bản.
- Summary một document.
- Question generation.
- RAG nhiều document trên UI.
- Search/filter nâng cao.

### Không làm trong MVP

- Student flow.
- Quiz attempt/result.
- Gamification, level, score.
- OCR, DOCX, PPTX.
- Dashboard phức tạp.
- Queue phân tán.
- RAG toàn thư viện không giới hạn scope.
- Tạo thêm Admin, đổi role, xóa cứng Teacher.

## 3. Hiện trạng đã xác minh

### Backend

Đã có:

- Spring Boot, PostgreSQL, Spring Security và JWT login.
- `User`, `Course`, `Lecture`, `CourseMember`.
- `Course.id` và `Lecture.id` đã là `Long`; không còn task đổi UUID.
- `ApiResponse` success/error envelope.
- Role `ADMIN`, `TEACHER`, `STUDENT`.

Chưa có:

- Flyway và migration quản lý schema.
- Document, processing job, upload/storage.
- AI client và background processing.
- Review/publication, Library và RAG proxy.

Cần sửa ngay:

- `spring.jpa.hibernate.ddl-auto=update` -> `validate`.
- JWT filter đang in token và thông tin xác thực ra console.
- `CustomUserDetails.isEnabled()` đang luôn trả `true`.
- Course/Lecture entity đã có nhưng controller hiện chưa tồn tại trên `develop`.

### AI Service

Đã có:

- `POST /v1/process-document`.
- PDF/TXT validation và parser.
- Text cleaning, token chunking và OpenAI embedding.
- Transaction replace chunks và mock tests.

Chưa có:

- Dockerfile cho AI Service.
- E2E thật với shared volume và schema chính thức.
- Retrieval theo `document_ids`.
- `POST /v1/answer-question`.
- Citation builder và grounded answer.

### Frontend

- Thư mục `frontend/` hiện chỉ có `.gitkeep`.
- Chưa có Vite, route, component, API client hoặc test.

### Infrastructure

- Docker Compose hiện có PostgreSQL, Backend và pgAdmin.
- Chưa có `ai-service` và named volume `uploads`.
- Root `.env.example` chưa có biến Backend - AI/shared storage.

## 4. Thành viên và ownership

| Thành viên | Vai trò | Ownership chính |
|---|---|---|
| Trương Mỹ Tâm | Backend | Spring Boot, migration, database ownership, Docker Compose, public API |
| Nguyễn Thành Đại Khánh | AI | FastAPI, processing, pgvector repository, retrieval, RAG, AI tests |
| Việt | Frontend | React, API integration, Library, My Documents, Admin Review, RAG UI |

Ownership không có nghĩa làm độc lập hoàn toàn. Mọi contract giao nhau phải qua
handoff checklist ở mục 12.

## 5. Quy tắc branch, commit và báo cáo

### Branch

```txt
develop
feature/mvp-document-backend
feature/mvp-rag-ai
feature/mvp-library-frontend
```

Trước mỗi batch:

```powershell
git checkout develop
git pull origin develop
git checkout <feature-branch>
git merge develop
```

Không làm trực tiếp trên `develop`. Không force-push. Không merge task chưa pass
acceptance.

### Commit

Mỗi task có ít nhất một commit riêng:

```txt
feat(backend): add document upload and processing job
feat(ai): add scoped vector retrieval
feat(frontend): add document library
test(e2e): verify publication and rag flow
```

### Completion report

Khi xong mỗi task, thành viên ghi trong pull request:

```txt
STATUS: DONE | PARTIAL | BLOCKED
TASK: <task-id>
FILES CHANGED: <danh sách + mục đích>
TEST RESULTS: <command + kết quả>
ACCEPTANCE: <số tiêu chí pass/tổng>
DEVIATIONS: <khác tài liệu, nếu có>
CONTEXT FORWARD: <đầu vào người tiếp theo cần biết>
```

## 6. Dependency và concurrency

### Ký hiệu

- `EXCLUSIVE`: sửa shared contract, migration, Docker hoặc file nền; không thực
  hiện song song với task khác đụng cùng vùng.
- `SAFE`: có thể chạy song song sau khi dependency đã hoàn thành và không sửa
  file thuộc owner khác.

### Task graph

```txt
INT-00 Contract lock
├── BE-01 Foundation ─> BE-02 Schema ─> BE-03 Upload
│                                      └─> BE-04 Async AI
│                                          ├─> BE-05 Review
│                                          ├─> BE-06 Library
│                                          └─> BE-07 RAG proxy
├── AI-01 Alignment/Docker ─> AI-02 Process E2E
│                             └─> AI-03 Retrieval ─> AI-04 RAG
└── FE-01 Scaffold ─> FE-02 API foundation
                      ├─> FE-03 Library
                      ├─> FE-04 My Documents
                      ├─> FE-05 Admin Review
                      └─> FE-06 RAG UI

BE-02 + AI-01 ─> INFRA-01 Docker/shared volume
BE-03 + BE-04 + AI-02 ─> INT-01 Upload handoff
BE-05 + BE-06 + FE-03 + FE-04 + FE-05 ─> INT-02 Web flow handoff
BE-07 + AI-04 + FE-06 ─> INT-03 RAG handoff
INT-01 + INT-02 + INT-03 ─> QA-01 Core E2E
```

### Concurrency matrix

| Batch | Task có thể làm song song | Task phải chờ/exclusive |
|---|---|---|
| A | Sau INT-00: BE-01, AI-01, FE-01 trên ba branch riêng | INT-00 khóa contract trước |
| B | FE-02 có thể chạy cùng BE-02 | BE-02 migration là exclusive trong Backend |
| C | FE-03 dùng mock contract khi BE-03/04 đang làm | INFRA-01 là exclusive với Docker/root env |
| D | AI-03, BE-05/06 và FE-04 có thể song song sau handoff upload | AI-02 phải độc quyền khi reset/test chunks |
| E | FE-05 có thể làm cùng AI-04 và BE-07 | Contract RAG phải khóa trước FE-06 |
| F | Unit test từng module có thể song song | QA-01 E2E chạy trên một integration state |

Hai thành viên không cùng sửa `docker-compose.yml`, root `.env.example`,
`05_DATABASE_SCHEMA.md` hoặc public API contract trong cùng thời điểm.

## 7. Lịch 7 ngày

| Ngày | Tâm - Backend | Khánh - AI | Việt - Frontend | Gate cuối ngày |
|---|---|---|---|---|
| 05/07 | BE-01 | AI-01 | FE-01 | Build/test nền pass |
| 06/07 | BE-02, INFRA-01 | Review schema/compose | FE-02 | DB sạch migrate được; FE shell chạy |
| 07/07 | BE-03, BE-04 | AI-02 | FE-03 | INT-01 upload -> chunks pass |
| 08/07 | BE-05, BE-06 | AI-03 | FE-04 | Review/Library API + retrieval pass |
| 09/07 | BE-07 | AI-04 | FE-05 | Admin publish và internal RAG pass |
| 10/07 | BE-08 | AI-05 | FE-06 | INT-02/INT-03 pass |
| 11/07 | QA-01, fix P0 | QA-01, fix P0 | FE-07, QA-01 | Core E2E và build toàn hệ thống pass |

Estimate là giờ làm tập trung, không bao gồm thời gian chờ handoff.

## 7.1. Task status board

### Quy ước status

| Status | Ý nghĩa |
|---|---|
| `TODO` | Chưa bắt đầu |
| `IN_PROGRESS` | Đang làm trên feature branch |
| `BLOCKED` | Bị chặn bởi dependency hoặc lỗi cần người khác xử lý |
| `REVIEW` | Code đã xong, đang chờ review/merge hoặc chờ gate cuối |
| `DONE` | Đã merge vào `develop` và pass acceptance/test liên quan |
| `DEFERRED` | Dời sau core MVP |

Quy tắc cập nhật:

- Chỉ chuyển `DONE` khi task đã merge vào `develop` và có evidence test/acceptance.
- Nếu `BLOCKED`, ghi rõ đang chờ task hoặc người nào trong cột `Notes`.
- Mỗi PR làm thay đổi trạng thái task phải cập nhật bảng này trong cùng PR hoặc PR docs ngay sau đó.
- `Evidence` ưu tiên ghi PR/commit, test command hoặc handoff gate; không ghi chung chung.

### Bảng trạng thái

| Task | Owner | Status | Started | Done | Evidence | Notes |
|---|---|---|---|---|---|---|
| INT-00 | Cả ba | TODO |  |  |  | Contract lock trước code P0 |
| BE-01 | Trương Mỹ Tâm | TODO |  |  |  | Security và Flyway foundation |
| BE-02 | Trương Mỹ Tâm | TODO |  |  |  | Migration và Document model |
| INFRA-01 | Trương Mỹ Tâm + Khánh | TODO |  |  |  | Docker Compose/shared volume |
| BE-03 | Trương Mỹ Tâm | TODO |  |  |  | Upload/storage |
| BE-04 | Trương Mỹ Tâm | TODO |  |  |  | Background processing và AI client |
| BE-05 | Trương Mỹ Tâm | TODO |  |  |  | Review/publication |
| BE-06 | Trương Mỹ Tâm | TODO |  |  |  | Library/download/document APIs |
| BE-07 | Trương Mỹ Tâm | TODO |  |  |  | RAG proxy và permission |
| BE-08 | Trương Mỹ Tâm | TODO |  |  |  | Backend integration tests/OpenAPI/seed |
| BE-09 | Trương Mỹ Tâm | DEFERRED |  |  |  | P1 quản lý Teacher, không chặn core |
| AI-01 | Nguyễn Thành Đại Khánh | DONE | 05/07/2026 | 05/07/2026 | `python -m pytest -q`; `python -m compileall -q app scripts tests`; `docker build -t lms-rag-ai-service .`; đã merge vào `develop` | Dockerfile, dev deps, storage key versioned |
| AI-02 | Nguyễn Thành Đại Khánh | TODO |  |  |  | Chờ BE-02 và INFRA-01 để E2E thật |
| AI-03 | Nguyễn Thành Đại Khánh | TODO |  |  |  | Scoped vector retrieval |
| AI-04 | Nguyễn Thành Đại Khánh | TODO |  |  |  | Grounded answer và citation |
| AI-05 | Nguyễn Thành Đại Khánh | TODO |  |  |  | AI tests/runbook |
| FE-01 | Việt | TODO |  |  |  | Scaffold/auth |
| FE-02 | Việt | TODO |  |  |  | API client/types/shared states |
| FE-03 | Việt | TODO |  |  |  | Library/detail |
| FE-04 | Việt | TODO |  |  |  | My Documents/upload |
| FE-05 | Việt | TODO |  |  |  | Admin Review |
| FE-06 | Việt | TODO |  |  |  | RAG panel/citation |
| FE-07 | Việt | TODO |  |  |  | Frontend tests/responsive/demo polish |
| FE-08 | Việt | DEFERRED |  |  |  | P1 quản lý Teacher, không chặn core |
| INT-01 | Tâm + Khánh | TODO |  |  |  | Upload -> AI processing handoff |
| INT-02 | Tâm + Việt | TODO |  |  |  | Backend public API -> Frontend handoff |
| INT-03 | Cả ba | TODO |  |  |  | RAG chain handoff |
| QA-01 | Cả ba | TODO |  |  |  | Core E2E 12 scenarios |

## 8. Task triển khai Backend - Trương Mỹ Tâm

### BE-01 - Chuẩn hóa security và migration foundation

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 4 giờ |
| Deadline | 05/07/2026 |
| Dependency | INT-00 |
| Concurrency | EXCLUSIVE trong `backend/pom.xml`, config và migration |

Thực hiện:

- Thêm Flyway PostgreSQL dependency.
- Chuyển Hibernate sang `ddl-auto=validate`.
- Xóa toàn bộ log token/principal/authorities khỏi JWT filter.
- Dùng logger phù hợp, không log secret.
- Cho `CustomUserDetails.isEnabled()` trả `status == ACTIVE`.
- Mở rộng login response trả cả JWT và `UserView` theo public contract.
- Giữ `Course.id` và `Lecture.id` là `Long`; không refactor ID lần nữa.

Acceptance:

- Given database sạch, when Backend start, then Flyway chạy trước Hibernate.
- Given Teacher `INACTIVE`, when login, then Backend trả `403` hoặc `401` theo
  error contract và không phát JWT.
- Given request có JWT, when filter chạy, then log không chứa token.
- `.\mvnw.cmd test` pass.

Handoff:

- Gửi Khánh và Việt base API URL, login response target và danh sách error code.

### BE-02 - Migration và Document model

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 06/07/2026 |
| Dependency | BE-01 |
| Concurrency | EXCLUSIVE; owner duy nhất của migration |

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

Migration phải theo mục 12 và `05_DATABASE_SCHEMA.md`.

Acceptance:

- Database sạch tạo đủ `users`, `courses`, `lectures`, `documents`,
  `document_processing_jobs`, `document_chunks`.
- `vector` extension và HNSW index tồn tại.
- Không tồn tại hai processing job `PROCESSING` cho cùng document.
- Backend khởi động với `ddl-auto=validate`.
- Khánh review `document_chunks` trước merge.

### INFRA-01 - Docker, shared volume và root environment

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm; Khánh bàn giao AI Docker image |
| Priority | P0 |
| Estimate | 4 giờ |
| Deadline | 06/07/2026 |
| Dependency | BE-01, AI-01 |
| Concurrency | EXCLUSIVE trong `docker-compose.yml` và root `.env.example` |

Thực hiện:

- Thêm service `ai-service`, build từ `ai-service/Dockerfile`.
- Expose AI port `8000:8000` cho local demo.
- Tạo named volume `uploads`.
- Backend mount read-write, AI mount read-only tại `/storage/uploads`.
- Hai service cùng network và cùng `INTERNAL_API_KEY`.
- Bổ sung toàn bộ env mục 12 vào root `.env.example`.
- Thêm healthcheck AI và dependency PostgreSQL healthy.

Acceptance:

- `docker compose config` không lỗi.
- PostgreSQL, Backend và AI cùng start bằng một compose command.
- Backend ghi file vào volume và AI đọc được cùng relative `storage_key`.
- Restart container không mất database hoặc uploaded file.
- Internal key/OpenAI key không hardcode trong Compose hoặc image.

Handoff:

- Tâm gửi Khánh tên service, mount path và lệnh logs.
- Khánh xác nhận health/process endpoint chạy trong container.
### BE-03 - Storage, Course/Lecture lookup và upload

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 8 giờ |
| Deadline | 07/07/2026 |
| Dependency | BE-02, INFRA-01 |
| Concurrency | EXCLUSIVE trong Document service/controller |

Tạo:

```txt
StorageProperties
DocumentStorageService
DocumentService
DocumentController
Course/Lecture lookup endpoints
```

Quy tắc:

- Multipart fields: `file`, `title`, `description`.
- `lectureId` nằm trong URL.
- Chỉ PDF/TXT, không rỗng, tối đa 20 MB.
- Xác minh Teacher có quyền dùng lecture.
- Tạo Document trước để lấy ID.
- Lưu file tại
  `UPLOAD_ROOT/documents/{document_id}/v{file_version}/source.{extension}`.
- Database chỉ lưu relative `storage_key`.
- Tạo job và trả `202`.
- Nếu lưu file thất bại, không để Document/job mồ côi.

Acceptance:

- Upload hợp lệ trả Document `UPLOADED + DRAFT` và một job.
- File thật tồn tại đúng storage key.
- File sai type/rỗng/quá 20 MB bị từ chối.
- Teacher không sở hữu lecture nhận `403`.
- Filename có path traversal không thoát khỏi `UPLOAD_ROOT`.

### BE-04 - Background processing và AI client

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 07/07/2026 |
| Dependency | BE-03, AI-01 |
| Concurrency | EXCLUSIVE trong processing service |

Tạo:

```txt
AiServiceProperties
AiServiceClient
AsyncConfig
DocumentUploadedEvent
DocumentProcessingService
DocumentProcessingJobController
```

Luồng:

```txt
upload transaction commit
-> @TransactionalEventListener(AFTER_COMMIT)
-> @Async
-> POST AI /v1/process-document
-> update job/document
```

Quy tắc:

- Không giữ database transaction trong HTTP call.
- Gửi `X-Internal-Key`.
- Success: document/job -> `PROCESSED`, lưu chunk count/processed time.
- Error/timeout: document/job -> `FAILED`, lưu error code/message đã rút gọn.
- Không retry vô hạn.
- Reprocess chỉ cho owner và không tạo hai active job.

Acceptance:

- Upload response không chờ OpenAI hoàn thành.
- Poll job quan sát được `PROCESSING -> PROCESSED|FAILED`.
- AI timeout không làm request thread treo.
- Hai reprocess đồng thời: một request bị conflict `409`.

### BE-05 - Review và publication

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 08/07/2026 |
| Dependency | BE-02 |
| Concurrency | EXCLUSIVE trong review service |

Thực hiện state machine:

```txt
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
PENDING_REVIEW -> PUBLISHED
PENDING_REVIEW -> REJECTED
PUBLISHED -> ARCHIVED
```

Quy tắc:

- Chỉ owner submit.
- Chỉ `PROCESSED` được submit.
- Chỉ Admin approve/reject/archive.
- Reject bắt buộc reason.
- Transition sai trả `409 DOCUMENT_STATE_CONFLICT`.
- Approve lưu reviewer/time/published time.

Acceptance:

- Draft của Teacher khác không truy cập được.
- Reject giữ tài liệu cho owner chỉnh sửa và gửi lại.
- Approve làm tài liệu đủ điều kiện vào Library.
- Request lặp không tạo transition sai hoặc ghi đè reviewer.

### BE-06 - Library, metadata, download và chỉnh sửa

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 08/07/2026 |
| Dependency | BE-03, BE-05 |
| Concurrency | EXCLUSIVE trong public document API |

Thực hiện:

- My Documents có pagination/filter status.
- Library chỉ trả `PUBLISHED`, search title và pagination.
- Document detail áp permission.
- Download stream file, đúng MIME và original filename.
- Owner chỉ sửa title/description khi `DRAFT` hoặc `REJECTED`.
- `lecture_id` không được thay đổi sau khi tạo Document trong core MVP. Nếu cần
  chuyển lecture, Teacher tạo Document mới để tránh lệch metadata với chunks.
- Owner thay file khi `DRAFT`, `REJECTED` hoặc processing `FAILED`.
- Thay file tăng `file_version`, sinh storage key mới và chạy processing lại.
- Delete chỉ cho owner khi `DRAFT` hoặc `REJECTED`.

Acceptance:

- Library không rò `DRAFT`, `PENDING_REVIEW`, `REJECTED`, `ARCHIVED`.
- Teacher B mở/download được document `PUBLISHED` của Teacher A.
- Teacher B không mở được draft của Teacher A.
- Thay file tạo `v2`, không ghi đè `v1`.

### BE-07 - Public RAG proxy và permission

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 09/07/2026 |
| Dependency | BE-06, AI-04 |
| Concurrency | EXCLUSIVE trong RAG service/controller |

Quy tắc:

- Validate 1-10 `document_ids`.
- Owner được hỏi document của mình nếu `PROCESSED`.
- Người khác chỉ được hỏi `PUBLISHED`.
- Nếu một ID không hợp lệ, từ chối toàn request trước khi gọi AI.
- Không gửi JWT sang AI.
- Map AI envelope sang public Backend envelope.

Acceptance:

- Không thể dùng RAG để đọc chunk của document không có quyền.
- Request hợp lệ giữ nguyên citation data.
- AI timeout trả error có kiểm soát, không lộ internal key.
- `not_found=true` vẫn là HTTP `200`.

### BE-08 - Backend integration tests, OpenAPI và seed verification

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 10/07/2026 |
| Dependency | BE-03 đến BE-07 |
| Concurrency | SAFE sau khi Backend feature code đã khóa |

Thực hiện:

- Controller/service tests cho permission và state transition.
- Integration test với PostgreSQL/pgvector hoặc test profile tương thích.
- OpenAPI mô tả đầy đủ public API.
- Xác nhận seed login được.
- Tạo `scripts/smoke_mvp.ps1` hoặc phối hợp QA-01.

Acceptance:

- Backend test command pass.
- Swagger khớp contract mục 10.
- Không còn token/secret trong log.
- Clean database startup pass.

### BE-09 - Quản lý Teacher

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm |
| Priority | P1 Should-have |
| Estimate | 6 giờ |
| Deadline | Sau core E2E hoặc 11/07 nếu còn thời gian |
| Dependency | BE-01, QA-01 core pass |
| Concurrency | EXCLUSIVE trong user management |

Chức năng:

- List/search/filter Teacher.
- Tạo Teacher với temporary password đã BCrypt.
- Sửa name/email.
- Activate/deactivate.
- Reset password.
- Không tạo Admin, đổi role hoặc xóa cứng.

Acceptance:

- Chỉ Admin truy cập API quản lý Teacher.
- Email không trùng và password luôn lưu BCrypt.
- Teacher INACTIVE không đăng nhập được.
- Response không chứa password/hash.

Task này không được làm chậm QA-01.

## 9. Task triển khai AI - Nguyễn Thành Đại Khánh

### AI-01 - Align contract, schema, config và Docker image

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 4 giờ |
| Deadline | 05/07/2026 |
| Dependency | INT-00 |
| Concurrency | SAFE với BE-01 và FE-01; EXCLUSIVE trong `ai-service/` |

Thực hiện:

- Chuẩn hóa mọi sample storage key thành
  `documents/{id}/v{version}/source.{extension}`.
- So sánh repository SQL với `05_DATABASE_SCHEMA.md`.
- Tạo `ai-service/Dockerfile`.
- Thêm healthcheck phù hợp.
- Tạo `requirements-dev.txt` chứa pytest nếu chưa có.
- Fail closed khi internal key rỗng/sai.

Acceptance:

- AI image build được.
- `/v1/health` chạy trong container.
- Unit tests hiện có pass.
- Không còn sample storage key thiếu version.

Handoff cho Tâm:

- Image port, health endpoint, env bắt buộc và lệnh start.

### AI-02 - Process-document E2E thật

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 07/07/2026 |
| Dependency | AI-01, BE-02, INFRA-01 |
| Concurrency | EXCLUSIVE khi ghi/reset `document_chunks` |

Thực hiện:

- Chạy file PDF/TXT từ shared volume.
- Dùng OpenAI embedding thật với document demo.
- Ghi đúng schema `document_chunks`.
- Xác nhận atomic reprocess rollback.
- Trả page/chunk count đúng contract.

Acceptance:

- Một PDF thật tạo chunks/vector trong PostgreSQL.
- Query SQL xác nhận đúng `document_id`, `lecture_id`, page và dimension 1536.
- Reprocess không tạo duplicate chunk index.
- Insert lỗi không xóa chunks cũ.

Handoff cho Tâm:

- Sample request/response/error.
- Document ID đã test và SQL kiểm chứng chunks.

### AI-03 - Scoped vector retrieval

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 08/07/2026 |
| Dependency | AI-02 |
| Concurrency | EXCLUSIVE trong repository/retrieval service |

Tạo:

```txt
RetrievedChunk
DocumentChunkRetrievalRepository
RetrievalService
```

Quy tắc:

- Input: `document_ids`, query embedding, `top_k`.
- Chỉ query IDs đã truyền.
- Cosine similarity, score giảm dần.
- Trả chunk ID, document ID, page, content/excerpt và score.
- Không retrieval toàn Library.

Acceptance:

- Không trả chunk ngoài `document_ids`.
- Kết quả liên quan nhất đứng trước.
- Document không có chunks trả lỗi/empty theo contract.
- Repository tests dùng dữ liệu xác định, không phụ thuộc OpenAI.

### AI-04 - Grounded answer và citation

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 7 giờ |
| Deadline | 09/07/2026 |
| Dependency | AI-03 |
| Concurrency | EXCLUSIVE trong RAG route/service |

Tạo:

```txt
AnswerQuestionRequest
AnswerQuestionResult
RagAnswerService
CitationBuilder
POST /v1/answer-question
```

Quy tắc:

- Prompt chỉ cho phép trả lời từ retrieved context.
- Không đủ context trả `not_found=true`.
- Citation lấy từ chunks thực sự đưa vào prompt.
- Không bịa document/page.
- Giới hạn question, document count và top_k theo contract.

Acceptance:

- Câu hỏi có trong tài liệu trả answer và ít nhất một citation đúng.
- Câu hỏi ngoài tài liệu trả `not_found=true`, citations rỗng.
- Sai internal key trả `401`.
- Mock generation tests không gọi OpenAI.

### AI-05 - AI integration tests và runbook

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 10/07/2026 |
| Dependency | AI-02 đến AI-04 |
| Concurrency | SAFE sau khi AI API đã khóa |

Thực hiện:

- Unit tests retrieval, citation và not-found.
- API tests process/answer/auth/error.
- Integration test pgvector được đánh marker riêng.
- Cập nhật AI README: local, Docker, test, sample request.
- Ghi phần giải thích code vào AI Learning Log sau khi code ổn định.

Acceptance:

- `python -m pytest -q` pass.
- Integration test thật pass khi có PostgreSQL/OpenAI key.
- README command chạy được từ fresh environment.
- Contract và code không còn lệch field/status.

## 10. Task triển khai Frontend - Việt

### Quyết định kỹ thuật đã khóa

```txt
React + Vite + TypeScript
React Router
Axios
TanStack Query cho server state
React Context cho auth
Vitest + Testing Library
```

Không thêm Redux. JWT lưu trong `sessionStorage` cho MVP và gắn qua Axios
interceptor. Logout phải xóa token/query cache.

### Route structure

```txt
/login
/library
/library/:documentId
/my-documents
/my-documents/:documentId
/admin/reviews
/admin/reviews/:documentId
/admin/teachers                 P1
```

### Folder structure mục tiêu

```txt
frontend/src/
  app/
    router.tsx
    queryClient.ts
  api/
    client.ts
    authApi.ts
    documentApi.ts
    adminApi.ts
    ragApi.ts
  auth/
    AuthProvider.tsx
    ProtectedRoute.tsx
    RoleRoute.tsx
  components/
    AppShell.tsx
    StatusBadge.tsx
    Pagination.tsx
    ConfirmDialog.tsx
    ErrorState.tsx
    EmptyState.tsx
  features/
    auth/
    library/
    documents/
    admin-review/
    rag/
  types/
    api.ts
    document.ts
  pages/
```

### FE-01 - Scaffold và authentication

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 05/07/2026 |
| Dependency | INT-00 |
| Concurrency | SAFE với BE-01 và AI-01 |

Thực hiện:

- Scaffold Vite TypeScript.
- Cài router, Axios, TanStack Query và test stack.
- Login form.
- Auth provider, protected route và role route.
- App shell với navigation theo role.

Acceptance:

- Login thành công lưu token và vào `/library`.
- Chưa login bị chuyển về `/login`.
- Teacher không mở được `/admin/*`.
- Admin thấy Review; Teacher thấy My Documents.
- Refresh tab trong phiên giữ đăng nhập.
- Build và frontend tests pass.

### FE-02 - API client, types và shared UI states

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 06/07/2026 |
| Dependency | FE-01, public contract mục 11 |
| Concurrency | SAFE; không đổi Backend contract |

Thực hiện:

- Axios base URL từ `VITE_API_BASE_URL`.
- Bearer interceptor và xử lý `401`.
- TypeScript types khớp envelope/DTO.
- Query key factory.
- Loading, error, empty, pagination và status badge.
- Toast chỉ dùng cho command result, không thay inline error.

Acceptance:

- API error hiển thị `error.message`, validation map theo field.
- `401` xóa session và đưa về login.
- Processing/publication badge tách riêng.
- Component không tự hardcode base URL hoặc token.

### FE-03 - Library và document detail

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 07/07/2026 |
| Dependency | FE-02, contract BE-06 |
| Concurrency | SAFE; có thể dùng mock response trước BE-06 |

Thực hiện:

- `/library`: search title, list/table và pagination.
- `/library/:documentId`: metadata, owner, lecture, file info.
- Download/open file.
- Gắn `RagPanel` placeholder để FE-06 hoàn thiện.

Acceptance:

- Chỉ render dữ liệu Backend trả; không lọc publication ở client để che lỗi BE.
- Loading/error/empty đầy đủ.
- Search reset về page 1.
- Document detail xử lý `403/404`.

### FE-04 - My Documents và upload

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 8 giờ |
| Deadline | 08/07/2026 |
| Dependency | FE-02, BE-03, BE-04 |
| Concurrency | SAFE sau INT-01 |

Thực hiện:

- Danh sách tài liệu của owner.
- Upload form chọn lecture, title, description, PDF/TXT.
- Client validate type/size để phản hồi sớm.
- Poll job khi processing.
- Retry/reprocess.
- Sửa metadata/thay file trong state cho phép.
- Submit review và hiển thị rejection reason.

Acceptance:

- Upload dùng đúng multipart field.
- Sau `202`, UI hiển thị processing và poll không nhân request vô hạn.
- `PROCESSED` mới bật submit.
- `PENDING_REVIEW` khóa chỉnh file.
- `REJECTED` hiển thị lý do và cho sửa/gửi lại.

### FE-05 - Admin Review

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 09/07/2026 |
| Dependency | FE-02, BE-05 |
| Concurrency | SAFE |

Thực hiện:

- Danh sách `PENDING_REVIEW`.
- Detail metadata và download/open file.
- Approve confirm.
- Reject dialog bắt buộc reason.
- Archive action tại document phù hợp.

Acceptance:

- Route chỉ Admin truy cập.
- Reject reason trống không gửi request.
- Approve/reject invalidate review queue và Library query.
- Transition lỗi `409` hiển thị và refetch data.

### FE-06 - RAG panel và citation

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 6 giờ |
| Deadline | 10/07/2026 |
| Dependency | FE-03, BE-07, AI-04, INT-03 |
| Concurrency | SAFE sau contract RAG lock |

Thực hiện:

- RAG panel trong document detail.
- Core gửi `[currentDocumentId]`.
- Hiển thị question, answer, not-found và citations.
- Citation hiển thị document title/page/excerpt.
- Chống double submit.

Acceptance:

- Không gửi request khi question rỗng.
- `not_found=true` không render citation giả.
- Citation mở đúng document; page deep-link là Should-have.
- Không hiển thị raw model/internal error.

### FE-07 - Frontend test, responsive và demo polish

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P0 |
| Estimate | 5 giờ |
| Deadline | 11/07/2026 |
| Dependency | FE-01 đến FE-06 |
| Concurrency | SAFE trước QA-01; không đổi contract |

Acceptance:

- Route/auth tests pass.
- Upload/review/RAG interaction tests pass với mock API.
- `npm run build`, `npm run lint`, `npm run test -- --run` pass.
- Không overflow/overlap ở desktop 1440px và mobile 390px.
- Không có secret/internal key trong bundle.

### FE-08 - Admin quản lý Teacher

| Thuộc tính | Giá trị |
|---|---|
| Owner | Việt |
| Priority | P1 Should-have |
| Estimate | 6 giờ |
| Deadline | Sau core E2E |
| Dependency | FE-02, BE-09 |
| Concurrency | SAFE |

Không làm task này trước khi FE-01 đến FE-07 pass.

Acceptance:

- Chỉ Admin mở được /admin/teachers.
- List/search/filter và pagination khớp API.
- Create/edit/activate/deactivate/reset password có confirm và error state.
- UI không gửi role hoặc hiển thị password/hash.

## 11. Contract Backend public API

Contract này phục vụ Frontend. Backend vẫn dùng `ApiResponse`.

### Envelope

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Thành công",
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_STATE_CONFLICT",
    "message": "Trạng thái tài liệu không hợp lệ",
    "details": []
  }
}
```

Pagination bắt đầu từ page `1`. Default `page=1`, `limit=10`, max `limit=50`.
`message` và `meta` là optional: `message` chỉ phục vụ hiển thị, `meta` chỉ có ở
response phân trang. Frontend xử lý logic bằng HTTP status, `success`, `data` và
`error.code`, không phụ thuộc vào nội dung `message`.

### DTO dùng chung

`UserView`:

```json
{
  "id": 2,
  "name": "Teacher A",
  "email": "teacher.a@example.com",
  "role": "TEACHER",
  "status": "ACTIVE"
}
```

`DocumentView`:

```json
{
  "id": 12,
  "lecture_id": 5,
  "lecture_title": "Java OOP",
  "uploaded_by": 2,
  "uploader_name": "Teacher A",
  "title": "Encapsulation",
  "description": "Bài giảng tuần 2",
  "original_filename": "oop.pdf",
  "file_type": "PDF",
  "file_size": 1024000,
  "file_version": 1,
  "processing_status": "PROCESSED",
  "publication_status": "DRAFT",
  "error_code": null,
  "error_message": null,
  "reviewed_by": null,
  "reviewer_name": null,
  "reviewed_at": null,
  "rejection_reason": null,
  "published_at": null,
  "created_at": "2026-07-05T08:00:00Z",
  "updated_at": "2026-07-05T08:05:00Z"
}
```

`ProcessingJobView`:

```json
{
  "id": 31,
  "document_id": 12,
  "status": "PROCESSING",
  "chunk_count": null,
  "error_code": null,
  "error_message": null,
  "started_at": "2026-07-05T08:00:01Z",
  "completed_at": null
}
```

### Auth

```txt
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "teacher.a@example.com",
  "password": "Demo@123"
}
```

Target response `200`:

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": 2,
      "name": "Teacher A",
      "email": "teacher.a@example.com",
      "role": "TEACHER",
      "status": "ACTIVE"
    }
  },
  "message": "Đăng nhập thành công"
}
```

Existing Backend chỉ trả token; BE-01 phải bổ sung `user` để FE không tự suy
diễn role từ UI. Sai credential: `401 INVALID_CREDENTIALS`. Inactive:
`403 USER_INACTIVE`.

### Course/Lecture lookup

```txt
GET /api/v1/my/courses?page=1&limit=50
GET /api/v1/courses/{courseId}/lectures?page=1&limit=50
```

Core chỉ cần list dữ liệu seed để upload. Course/Lecture CRUD đầy đủ không chặn
core demo.

### Documents

```txt
POST /api/v1/lectures/{lectureId}/documents
Content-Type: multipart/form-data
file=<binary>
title=<string>
description=<optional string>
```

Success `202`: `DocumentView` và `processing_job`.

```txt
GET /api/v1/my/documents?page=1&limit=10&processing_status=&publication_status=
GET /api/v1/documents/{documentId}
GET /api/v1/documents/{documentId}/download
GET /api/v1/document-processing-jobs/{jobId}
PATCH /api/v1/documents/{documentId}
POST /api/v1/documents/{documentId}/replace-file
POST /api/v1/documents/{documentId}/reprocess
POST /api/v1/documents/{documentId}/submit-review
DELETE /api/v1/documents/{documentId}
```

PATCH request chỉ nhận:

```json
{
  "title": "Tên mới",
  "description": "Mô tả mới"
}
```

Không cho cập nhật `lecture_id` sau khi Document đã được tạo.

Replace-file dùng multipart field `file`, trả `202` với Document/job mới.
Submit/reprocess không cần body.

### Admin Review

```txt
GET /api/v1/admin/document-reviews?page=1&limit=10
POST /api/v1/admin/documents/{documentId}/approve
POST /api/v1/admin/documents/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
```

Reject request:

```json
{
  "reason": "Tài liệu thiếu thông tin tác giả."
}
```

Approve/archive không cần body. Command success trả DocumentView.

### Library

```txt
GET /api/v1/library/documents?page=1&limit=10&query=
GET /api/v1/library/documents/{documentId}
GET /api/v1/documents/{documentId}/download
```

Library list/detail chỉ trả `PUBLISHED`.

### Public RAG

```txt
POST /api/v1/rag/answer
```

Request:

```json
{
  "document_ids": [12],
  "question": "Encapsulation là gì?",
  "top_k": 5,
  "language": "vi"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "answer": "Encapsulation là...",
    "not_found": false,
    "citations": [
      {
        "chunk_id": 120,
        "document_id": 12,
        "document_title": "Encapsulation",
        "page_number": 5,
        "excerpt": "Encapsulation là tính chất...",
        "score": 0.92
      }
    ],
    "tokens_used": 620
  }
}
```

Backend bổ sung `document_title` từ dữ liệu đã kiểm permission nếu AI response
chưa có.

### Admin quản lý Teacher - P1 Should-have

```txt
GET   /api/v1/admin/teachers?query=&status=&page=1&limit=10
POST  /api/v1/admin/teachers
PATCH /api/v1/admin/teachers/{teacherId}
POST  /api/v1/admin/teachers/{teacherId}/activate
POST  /api/v1/admin/teachers/{teacherId}/deactivate
POST  /api/v1/admin/teachers/{teacherId}/reset-password
```

Create request:

```json
{
  "name": "Nguyễn Văn A",
  "email": "teacher@example.com",
  "temporary_password": "TempPass123!"
}
```

PATCH chỉ nhận `name`, `email`. Reset-password chỉ nhận
`temporary_password`. Backend luôn gán role `TEACHER`, không nhận role từ client
và không trả password/hash. Chỉ role `ADMIN` gọi được các endpoint này.
### Public error code tối thiểu

| HTTP | Code | Khi dùng |
|---:|---|---|
| 400 | `INVALID_INPUT` | Payload/query sai |
| 401 | `INVALID_CREDENTIALS` | Login sai |
| 401 | `UNAUTHENTICATED` | Thiếu/hết hạn JWT |
| 403 | `USER_INACTIVE` | Tài khoản bị khóa |
| 403 | `FORBIDDEN` | Không có quyền document/lecture |
| 404 | `DOCUMENT_NOT_FOUND` | Không tìm thấy hoặc không được phép lộ tồn tại |
| 404 | `JOB_NOT_FOUND` | Không có processing job |
| 409 | `DOCUMENT_STATE_CONFLICT` | Transition sai |
| 409 | `PROCESSING_ALREADY_ACTIVE` | Có active job |
| 413 | `FILE_TOO_LARGE` | File quá 20 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Không phải PDF/TXT |
| 422 | `INVALID_FILE_CONTENT` | File rỗng/hỏng |
| 502 | `AI_SERVICE_ERROR` | AI lỗi có response |
| 503 | `AI_SERVICE_UNAVAILABLE` | AI/database/provider không sẵn sàng |
| 504 | `AI_SERVICE_TIMEOUT` | AI timeout |

## 12. Migration, Docker và environment

### Migration version plan

```txt
backend/src/main/resources/db/migration/
  V1__baseline_core_schema.sql
  V2__add_document_processing_and_pgvector.sql
  V3__seed_mvp_demo_data.sql
```

`V1`:

- Tạo/chuẩn hóa `users`, `courses`, `lectures`, `course_members` theo entity
  hiện hành.
- ID là BIGINT/BIGSERIAL.

`V2`:

- `CREATE EXTENSION vector`.
- Tạo documents, processing jobs, chunks, constraints và indexes đúng
  `05_DATABASE_SCHEMA.md`.

`V3`:

- Seed đúng một Admin.
- Seed hai Teacher.
- Seed ít nhất một course và hai lecture.
- Dùng email cố định, `ON CONFLICT DO NOTHING`.
- Password demo là BCrypt hash, không lưu plain text trong SQL comment/log.

Demo credentials được ghi trong tài liệu chạy local hoặc `.env.example`, không
dùng cho production.

Repository chưa có production data. Với local database cũ do
`ddl-auto=update` tạo, nhóm backup nếu cần rồi recreate volume để Flyway chạy từ
database sạch; không xây data migration phức tạp trong MVP.

### Docker target

```txt
postgres
backend
ai-service
pgadmin             optional
```

Named volumes:

```txt
pgdata
uploads
pgadmin_data
```

Mount:

```txt
backend:    uploads:/storage/uploads
ai-service: uploads:/storage/uploads:ro
```

Backend depends on PostgreSQL healthy. AI depends on PostgreSQL healthy.
Backend không cần block startup chờ AI, nhưng processing phải trả lỗi có kiểm
soát khi AI chưa sẵn sàng.

### Root environment target

```txt
DB_NAME
DB_USERNAME
DB_PASSWORD
JWT_SECRET_BASE64
JWT_EXPIRATION_MS
UPLOAD_ROOT=/storage/uploads
MAX_FILE_SIZE_MB=20
AI_SERVICE_BASE_URL=http://ai-service:8000
INTERNAL_API_KEY
OPENAI_API_KEY
EMBEDDING_MODEL=text-embedding-3-small
GENERATION_MODEL=gpt-4o-mini
EMBEDDING_DIMENSIONS=1536
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

`INTERNAL_API_KEY` giống nhau ở Backend và AI, không đưa vào Frontend.

## 13. Handoff checklist

### INT-00 - Contract lock

| Thuộc tính | Giá trị |
|---|---|
| Owner | Cả ba; Khánh cập nhật docs, Tâm và Việt review |
| Priority | P0 |
| Estimate | 2 giờ |
| Deadline | 05/07/2026, trước các task code P0 |
| Dependency | Không |
| Concurrency | EXCLUSIVE khi khóa contract |

Acceptance:

Checklist dưới đây được tick trong pull request khi từng thành viên đã review.
Chỉ coi INT-00 và contract đã khóa khi cả bốn mục đều `[x]`.

- [ ] Tâm xác nhận public API, DTO và error code.
- [ ] Khánh xác nhận internal AI API và schema chunks.
- [ ] Việt xác nhận field FE cần đã có.
- [ ] Không còn endpoint/field chỉ tồn tại trong chat.

### INT-01 - Backend upload -> AI processing

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm + Nguyễn Thành Đại Khánh |
| Priority | P0 |
| Estimate | 3 giờ |
| Deadline | 07/07/2026 |
| Dependency | BE-03, BE-04, AI-02, INFRA-01 |
| Concurrency | EXCLUSIVE trên integration database/volume |

Tâm bàn giao:

- [ ] Migration đã chạy.
- [ ] Sample Document/job row.
- [ ] File thật tại `documents/{id}/v1/source.pdf`.
- [ ] Sample request có internal key đã che giá trị.
- [ ] Compose service/network/volume đã sẵn sàng.

Khánh xác nhận:

- [ ] AI resolve đúng cùng file.
- [ ] Process response đúng contract.
- [ ] Chunks/vector tồn tại.
- [ ] Error mapping mẫu cho file lỗi/provider lỗi.

Gate pass khi upload một file từ Backend cuối cùng tạo Document `PROCESSED`.

### INT-02 - Backend public API -> Frontend

| Thuộc tính | Giá trị |
|---|---|
| Owner | Trương Mỹ Tâm + Việt |
| Priority | P0 |
| Estimate | 3 giờ |
| Deadline | 10/07/2026 |
| Dependency | BE-05, BE-06, FE-03, FE-04, FE-05 |
| Concurrency | EXCLUSIVE trên integration API |

Acceptance và handoff:

Tâm bàn giao:

- [ ] OpenAPI/Swagger chạy được.
- [ ] Seed credentials.
- [ ] Base URL/CORS.
- [ ] Sample success/error/pagination.
- [ ] Danh sách status và permission.

Việt xác nhận:

- [ ] Types khớp response thực.
- [ ] Login, upload, poll, submit, approve và Library chạy.
- [ ] Không còn mock trong core flow.

### INT-03 - RAG chain

| Thuộc tính | Giá trị |
|---|---|
| Owner | Nguyễn Thành Đại Khánh + Trương Mỹ Tâm + Việt |
| Priority | P0 |
| Estimate | 3 giờ |
| Deadline | 10/07/2026 |
| Dependency | AI-04, BE-07, FE-06 |
| Concurrency | EXCLUSIVE trên integration RAG flow |

Acceptance:

- [ ] Khánh cung cấp internal answer request/response.
- [ ] Tâm kiểm permission trước khi gọi AI.
- [ ] Tâm map citation và error sang public API.
- [ ] Việt hiển thị answer/not-found/citation.
- [ ] Test document không được phép không tới AI.

## 14. Test command và quality gate

### Backend

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd clean package
```

Gate:

- Test pass.
- Package thành công.
- Flyway migrate database sạch.
- Không log token/internal key/password.

### AI

```powershell
cd ai-service
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest -q
python scripts/check_pgvector.py
```

Integration test thật chỉ chạy khi PostgreSQL và OpenAI key đã cấu hình; phải
được đánh marker để unit test không phụ thuộc network.

### Frontend

```powershell
cd frontend
npm install
npm run lint
npm run test -- --run
npm run build
```

Gate:

- Không TypeScript/build/lint error.
- Route/auth tests pass.
- Không secret trong generated bundle.

### Docker

```powershell
docker compose config
docker compose up -d --build postgres ai-service backend
docker compose ps
docker compose logs --tail 100 backend ai-service
```

Health:

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health
Invoke-RestMethod http://localhost:8000/v1/health
```

### QA-01 - Core E2E

| Thuộc tính | Giá trị |
|---|---|
| Owner | Cả ba; Tâm điều phối service, Khánh kiểm AI/DB, Việt thao tác UI |
| Estimate | 5 giờ |
| Deadline | 11/07/2026 |
| Dependency | INT-01, INT-02, INT-03 |
| Concurrency | EXCLUSIVE trên integration environment |

Scenarios bắt buộc:

1. Teacher A login và upload PDF thật.
2. Job chuyển `PROCESSING -> PROCESSED`.
3. Chunks/vector tồn tại trong PostgreSQL.
4. Teacher A submit review.
5. Admin reject có reason; Teacher sửa và submit lại.
6. Admin approve.
7. Teacher B thấy document trong Library và download được.
8. Teacher B hỏi câu có trong tài liệu, citation đúng page.
9. Teacher B hỏi ngoài tài liệu, nhận `not_found`.
10. Teacher B không truy cập draft của Teacher A.
11. Internal key sai bị AI từ chối.
12. Restart service không làm mất database/upload.

Gate chỉ pass khi toàn bộ scenario P0 pass. Lỗi P1 có thể defer và ghi rõ.

## 15. Thứ tự merge

1. `docs: lock member-level mvp implementation plan`
2. `fix(backend): secure jwt and enable flyway`
3. `feat(ai): align storage contract and add docker image`
4. `feat(frontend): scaffold app and authentication`
5. `feat(database): add document and pgvector migrations`
6. `chore(docker): add ai service and shared upload volume`
7. `feat(backend): add document upload and async processing`
8. `test(ai): verify process document with pgvector`
9. `feat(backend): add review publication and library`
10. `feat(ai): add retrieval and grounded rag citations`
11. `feat(backend): add rag proxy and permission checks`
12. `feat(frontend): add document review library and rag flows`
13. `test(e2e): verify upload publication and rag flow`

Sau mỗi merge vào `develop`, ba branch còn lại phải merge `develop` trước task
phụ thuộc tiếp theo.

## 16. Definition of Done

Core MVP hoàn thành khi:

- QA-01 pass đủ 12 scenario.
- Backend, AI và Frontend build/test pass bằng command trong tài liệu.
- Database sạch tự migrate và seed được.
- Shared volume hoạt động thật.
- Chunks/vector thực sự tồn tại trong PostgreSQL.
- Draft không xuất hiện trong Library.
- RAG không truy cập document chưa được Backend cho phép.
- Citation đúng document và page.
- Không có JWT, password, OpenAI key hoặc internal key trong log/bundle.
- Swagger/public API, AI contract và code khớp nhau.
- Mỗi task P0 có completion report và handoff.

Các task Should-have không chặn core MVP.
