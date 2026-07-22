# System Design - LMS-RAG Document-Centric MVP

**Phiên bản:** 1.2
**Cập nhật:** 23/07/2026
**Mục tiêu:** Tổng hợp thiết kế hệ thống từ các contract docs đã chốt

---

## 1. Tổng quan hệ thống

LMS-RAG là hệ thống quản lý tài liệu và hỗ trợ giảng dạy sử dụng RAG cho giảng viên ngành CNTT. Trọng tâm của core MVP là **Document**: giảng viên upload tài liệu, Admin kiểm duyệt, sau đó tài liệu xuất hiện trong Library để giảng viên khác tra cứu bằng RAG có citation.


### Luồng demo bắt buộc

```txt
Teacher A login
  -> upload PDF/TXT
  -> nhập metadata subject/topic/chapter/tags
  -> Backend tạo Document + lưu file
  -> Backend gọi AI Service analyze background
  -> AI trả can_rag/estimated info và Backend cập nhật ANALYZED
  -> Teacher A submit review
  -> Admin approve
  -> Document xuất hiện trong Library
  -> Backend gọi AI Service index RAG background
  -> AI parse/clean/chunk/embed và lưu document_chunks
  -> Teacher B login
  -> mở Document trong Library
  -> hỏi RAG trên document đó
  -> nhận answer + citation đúng nguồn
```

---

## 2. Kiến trúc tổng thể

```txt
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    React + Vite                              │
│          (Library, My Documents, Admin Review)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / JWT Bearer
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend                                │
│                   Spring Boot 4.0.6                          │
│  Auth | Upload | Documents | Review | Library | RAG Proxy    │
└────────────┬───────────────────────────────┬────────────────┘
             │ REST / X-Internal-Key         │ SQL
             ▼                               ▼
┌─────────────────────────┐      ┌──────────────────────────┐
│      AI Service         │      │    PostgreSQL + pgvector │
│      FastAPI (Python)   │      │  users | documents       │
│  analyze-document       │      │  document_processing_jobs│
│  index/process-document │      │  document_chunks         │
│  answer-question        │      │                          │
└─────────────────────────┘      └──────────────────────────┘
```

### Các thành phần

| Thành phần | Công nghệ | Trách nhiệm chính |
|---|---|---|
| Frontend | React + Vite | Library, My Documents, Admin Review, RAG UI |
| Backend | Spring Boot | JWT, Teacher accounts, upload, review, Library, RAG proxy/history, quiz lifecycle |
| AI Service | FastAPI | Parse, chunk, embedding, retrieval, RAG answer, sinh quiz draft |
| Database | PostgreSQL + pgvector | Nghiệp vụ, quiz, RAG history và vector storage |

---

## 3. Luồng dữ liệu chính

### 3.1. Upload và xử lý tài liệu

```txt
Teacher upload tài liệu
  -> nhập title/description/subject/topic/chapter/tags
  -> Backend validate và lưu file
  -> tạo Document: UPLOADED + DRAFT
  -> tạo analyze job
  -> background call AI /v1/analyze-document
  -> AI parse nhẹ để xác định can_rag
  -> Backend cập nhật ANALYZED hoặc FAILED
```

### 3.2. Review và công bố

```txt
Teacher submit document ANALYZED
  -> PENDING_REVIEW
  -> Admin approve
  -> PUBLISHED
  -> xuất hiện trong Library
  -> nếu rag_eligible=true, Backend gọi AI /v1/index-document
  -> index xong: PROCESSED
```

### 3.3. Library và RAG

```txt
Teacher mở Library
  -> lọc theo metadata
  -> chọn document được phép truy cập
  -> Backend kiểm quyền từng document_id
  -> chỉ cho hỏi RAG khi document PUBLISHED và PROCESSED
  -> AI embedding câu hỏi
  -> retrieval chunks trong document_ids
  -> sinh answer từ context
  -> trả citations
```

### 3.4. Sinh và công bố quiz

```txt
Teacher chọn document PUBLISHED + PROCESSED
  -> Backend gọi AI /v1/generate-quiz
  -> Backend kiểm tra shape/số câu AI trả về
  -> lưu quizzes + quiz_questions ở trạng thái DRAFT
  -> Teacher owner xem/chỉnh sửa câu hỏi hiện có
  -> publish: DRAFT -> PUBLISHED
```

---

## 4. Actor và phân quyền

### 4.1. Teacher

- Đăng nhập, xem Library.
- Upload PDF/TXT không cần Course/Lecture.
- Gắn metadata: subject, topic, chapter, tags, description.
- Quản lý tài liệu của mình ở trạng thái cho phép sửa.
- Theo dõi trạng thái xử lý AI, retry/reprocess.
- Dùng RAG trên tài liệu của mình khi tài liệu đã được index RAG xong (`PROCESSED`).
- Gửi tài liệu cho Admin duyệt.
- Xem lý do từ chối, chỉnh sửa và gửi lại.
- Dùng RAG trên tài liệu `PUBLISHED` của giảng viên khác.
- Sinh quiz từ document `PUBLISHED + PROCESSED`; chỉ xem, sửa và publish quiz do chính mình tạo.

### 4.2. Admin

- Xem hàng đợi `PENDING_REVIEW`.
- Xem metadata và file cần duyệt.
- Approve để công bố.
- Reject kèm lý do.
- Archive tài liệu đã công bố.
- Should-have: quản lý tài khoản Teacher cơ bản.

Hệ thống có **một Admin duy nhất**, tạo bằng migration/seed.

---

## 5. State transitions

### 5.1. Processing status

```txt
UPLOADED -> ANALYZING -> ANALYZED
                      -> FAILED

ANALYZED --Admin approve--> PROCESSING -> PROCESSED
                                      -> FAILED

FAILED/ANALYZED/PROCESSED --retry/reprocess--> ANALYZING
FAILED/PROCESSED --index lại--> PROCESSING
```

### 5.2. Publication status

```txt
DRAFT --Teacher submit--> PENDING_REVIEW
PENDING_REVIEW --Admin approve--> PUBLISHED
PENDING_REVIEW --Admin reject--> REJECTED
REJECTED --Teacher sửa và submit lại--> PENDING_REVIEW
PUBLISHED --Admin archive--> ARCHIVED
```

### Quy tắc

- Hai trạng thái được lưu ở **hai cột riêng** trên `documents`.
- Upload tự chạy analyze nhẹ nhưng **không tự submit review**.
- Chỉ document `ANALYZED` được submit review.
- `PROCESSED` nghĩa là đã index RAG xong.
- Chỉ `PUBLISHED` xuất hiện trong Library.

---

## 6. Permission matrix

| Publication status | Teacher owner | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem, sửa metadata/file, xóa, submit nếu `ANALYZED`, RAG nếu đã `PROCESSED` | Không | Không cần |
| `PENDING_REVIEW` | Xem, không thay file | Không | Xem, approve, reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem, archive |
| `REJECTED` | Xem lý do, sửa metadata/file, xóa, submit lại | Không | Xem lịch sử |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

> Backend là nơi thực thi permission. AI Service không xác thực user hoặc role.

---

## 7. Database design

### 7.1. Các bảng

| Bảng | Mục đích |
|---|---|
| `users` | Tài khoản Admin/Teacher, login, role, status |
| `documents` | Tài liệu do Teacher upload, bảng trung tâm nghiệp vụ |
| `document_processing_jobs` | Theo dõi các lần AI process/reprocess |
| `document_chunks` | Lưu chunk text và embedding pgvector |
| `rag_conversations` | Lưu hội thoại RAG theo user + document |
| `rag_messages` | Lưu user/assistant messages của hội thoại RAG |
| `quizzes` | Metadata, owner và trạng thái quiz sinh từ document |
| `quiz_questions` | Câu hỏi, options, đáp án, giải thích và citations của quiz |

### 7.2. Quan hệ

```txt
users.id
  ├── documents.uploaded_by
  ├── documents.reviewed_by
  ├── rag_conversations.user_id
  └── quizzes.created_by

documents.id
  ├── document_processing_jobs.document_id
  ├── document_chunks.document_id
  ├── rag_conversations.document_id
  └── quizzes.document_id

quizzes.id
  └── quiz_questions.quiz_id
```

| Quan hệ | Ý nghĩa |
|---|---|
| `users 1 - N documents` | Một Teacher upload nhiều Document |
| `users 1 - N reviewed documents` | Một Admin review nhiều Document |
| `documents 1 - N document_processing_jobs` | Một Document có thể process/reprocess nhiều lần |
| `documents 1 - N document_chunks` | Một Document có nhiều chunks sau khi AI xử lý |
| `users 1 - N quizzes` | Một Teacher có thể tạo nhiều quiz |
| `documents 1 - N quizzes` | Một Document có thể được dùng để sinh nhiều quiz |
| `quizzes 1 - N quiz_questions` | Một Quiz có nhiều câu hỏi |

### 7.3. Kiểu dữ liệu chung

```txt
PostgreSQL ID: BIGINT/BIGSERIAL
Java ID: Long
Python/JSON ID: int
Timestamp: TIMESTAMPTZ
Embedding: VECTOR(1536)
Similarity: cosine
Tags: JSONB array
```

### 7.4. Chi tiết thuộc tính từng bảng

#### `users`

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | ID tự tăng |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE | Email đăng nhập |
| `password` | `VARCHAR(255)` | NOT NULL | Mật khẩu BCrypt hash |
| `name` | `VARCHAR(255)` | NOT NULL | Tên hiển thị |
| `role` | `VARCHAR(20)` | NOT NULL, CHECK `ADMIN`/`TEACHER`/`STUDENT` | Vai trò |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `ACTIVE`, CHECK `ACTIVE`/`INACTIVE` | Trạng thái |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian tạo |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian cập nhật |

#### `documents`

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | ID tự tăng |
| `uploaded_by` | `BIGINT` | NOT NULL, FK → `users(id)` | Teacher upload |
| `title` | `VARCHAR(255)` | NOT NULL | Tiêu đề |
| `description` | `TEXT` | | Mô tả |
| `subject` | `VARCHAR(150)` | | Môn học |
| `topic` | `VARCHAR(255)` | | Chủ đề |
| `chapter` | `VARCHAR(100)` | | Chương/bài |
| `tags` | `JSONB` | NOT NULL, DEFAULT `[]`, CHECK array | Tags |
| `original_filename` | `VARCHAR(255)` | NOT NULL | Tên file gốc |
| `stored_filename` | `VARCHAR(255)` | NOT NULL | Tên file lưu |
| `storage_key` | `TEXT` | NOT NULL, UNIQUE | Đường dẫn tương đối |
| `file_version` | `INT` | NOT NULL, DEFAULT 1, CHECK > 0 | Phiên bản file |
| `file_type` | `VARCHAR(20)` | NOT NULL, CHECK `PDF`/`TXT` | Loại file |
| `mime_type` | `VARCHAR(100)` | | MIME type |
| `file_size` | `BIGINT` | NOT NULL, CHECK > 0 | Kích thước file |
| `processing_status` | `VARCHAR(30)` | NOT NULL, DEFAULT `UPLOADED`, CHECK `UPLOADED`/`ANALYZING`/`ANALYZED`/`PROCESSING`/`PROCESSED`/`FAILED` | Trạng thái analyze/index AI |
| `publication_status` | `VARCHAR(30)` | NOT NULL, DEFAULT `DRAFT`, CHECK `DRAFT`/`PENDING_REVIEW`/`PUBLISHED`/`REJECTED`/`ARCHIVED` | Trạng thái kiểm duyệt |
| `error_code` | `VARCHAR(50)` | | Mã lỗi AI |
| `error_message` | `TEXT` | | Chi tiết lỗi AI |
| `processed_at` | `TIMESTAMPTZ` | | Thởi điểm AI xử lý xong |
| `reviewed_by` | `BIGINT` | FK → `users(id)`, ON DELETE SET NULL | Admin review |
| `reviewed_at` | `TIMESTAMPTZ` | | Thởi điểm review |
| `rejection_reason` | `TEXT` | | Lý do từ chối |
| `published_at` | `TIMESTAMPTZ` | | Thởi điểm công bố |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian tạo |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian cập nhật |

#### `document_processing_jobs`

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | ID tự tăng |
| `document_id` | `BIGINT` | NOT NULL, FK → `documents(id)`, CASCADE | Document được xử lý |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `PROCESSING`, CHECK `PROCESSING`/`PROCESSED`/`FAILED` | Trạng thái job |
| `chunk_count` | `INT` | CHECK >= 0 OR NULL | Số chunk tạo được |
| `error_code` | `VARCHAR(50)` | | Mã lỗi |
| `error_message` | `TEXT` | | Chi tiết lỗi |
| `started_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian bắt đầu |
| `completed_at` | `TIMESTAMPTZ` | | Thởi gian kết thúc |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian tạo |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian cập nhật |

> Partial unique index: một document chỉ có 1 job `PROCESSING` active.

#### `document_chunks`

| Thuộc tính | Kiểu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | ID tự tăng |
| `document_id` | `BIGINT` | NOT NULL, FK → `documents(id)`, CASCADE | Document thuộc về |
| `page_number` | `INT` | CHECK > 0 OR NULL | Số trang (PDF) |
| `chunk_index` | `INT` | NOT NULL, CHECK >= 0 | Index chunk |
| `content` | `TEXT` | NOT NULL, CHECK length(trim(content)) > 0 | Nội dung chunk |
| `token_count` | `INT` | NOT NULL, CHECK > 0 | Số token |
| `embedding` | `VECTOR(1536)` | NOT NULL | Vector embedding |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Thởi gian tạo |

> UNIQUE `(document_id, chunk_index)`.

---

## 8. API contract tổng quan

### 8.1. Backend public API

#### Auth

```txt
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/refresh/revoke
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/me/profile
PATCH /api/v1/me/profile
POST /api/v1/me/change-password
```

#### Documents

```txt
POST   /api/v1/documents
GET    /api/v1/my/documents
GET    /api/v1/my/documents/{documentId}
PATCH  /api/v1/my/documents/{documentId}
DELETE /api/v1/my/documents/{documentId}
POST   /api/v1/my/documents/{documentId}/reprocess-rag
POST   /api/v1/my/documents/{documentId}/submit-review
GET    /api/v1/documents/{documentId}/content
GET    /api/v1/documents/{documentId}/download
```

#### Admin

```txt
GET  /api/v1/admin/reviews
GET  /api/v1/admin/reviews/{documentId}
POST /api/v1/admin/reviews/{documentId}/approve
POST /api/v1/admin/reviews/{documentId}/reject
POST /api/v1/admin/documents/{documentId}/archive
GET  /api/v1/admin/teachers
POST /api/v1/admin/teachers
POST /api/v1/admin/teachers/batch
PATCH /api/v1/admin/teachers/{teacherId}
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

#### Library/RAG

```txt
GET  /api/v1/library
GET  /api/v1/library/{documentId}
POST /api/v1/rag/answer
GET  /api/v1/rag/conversations/by-document/{documentId}
POST /api/v1/rag/conversations/{conversationId}/messages
GET  /api/v1/rag/conversations/{conversationId}/messages
DELETE /api/v1/rag/conversations/{conversationId}/messages
```

#### Quiz

```txt
POST  /api/v1/quiz/generate
GET   /api/v1/quiz/{quizId}
PATCH /api/v1/quiz/{quizId}
POST  /api/v1/quiz/{quizId}/publish
```

Các API quiz chỉ dành cho `TEACHER`. Generate yêu cầu document `PUBLISHED + PROCESSED`; xem/sửa/publish
yêu cầu Teacher là owner, và sửa/publish chỉ áp dụng khi quiz còn `DRAFT`.

### 8.2. AI internal API

```txt
GET  /v1/health
GET  /v1/health/pgvector
POST /v1/analyze-document
POST /v1/index-document
POST /v1/answer-question
POST /v1/generate-quiz
```

`/v1/process-document` là endpoint cũ có thể được giữ làm implementation tương đương index trong giai đoạn chuyển tiếp.

### 8.3. Authentication

- Frontend → Backend: `Authorization: Bearer <JWT>`
- Backend → AI: `X-Internal-Key: <shared-secret>`

---

## 9. Shared storage

### Docker volume

```txt
uploads
```

### Mount

```txt
Backend: /storage/uploads (read-write)
AI:      /storage/uploads (read-only)
```

### Storage key format

```txt
documents/{document_id}/{version}/source.{extension}
```

Ví dụ: `documents/12/v1/source.pdf`

- Là relative path.
- Chỉ dùng `/`.
- Không chứa `..`, Windows drive, `:` hoặc absolute path.
- Mỗi lần thay file tăng version.

---

## 10. AI pipeline

### 10.1. Process document

```txt
storage_key
  -> resolve dưới UPLOAD_ROOT
  -> validate file
  -> parse PDF/TXT
  -> clean text
  -> chunk theo token
  -> embedding
  -> atomic replace document_chunks
  -> trả page_count/chunk_count
```

Config chunking mặc định:

```txt
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
```

Config embedding:

```txt
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

### 10.2. Retrieval & RAG

```txt
question
  -> validate
  -> query embedding
  -> vector search trong document_ids
  -> top_k chunks
  -> similarity threshold
  -> build context có source markers
  -> generation prompt
  -> answer + citations
```

RAG chỉ retrieval theo `document_ids` đã được Backend kiểm quyền. Không retrieval toàn Library.

---

## 11. Security

- Frontend chỉ gọi Backend.
- Backend gọi AI bằng `X-Internal-Key`.
- Draft/rejected/archived không lộ trong Library.
- Không log JWT, secret hoặc OpenAI key.
- AI chỉ trả lỗi dựa trên retrieved context.
- Citation phải truy ngược được về document và page.

---

## 12. Deployment

### Docker Compose services

```txt
postgres
backend
ai-service
frontend (optional)
pgadmin (optional)
uploads named volume
```

### Environment chính

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

---

## 13. Implementation phases

### Phase 1: Foundation

- BE-01: Database migration MVP.
- BE-02: Document entity/repository.
- FE-01: App shell, route guard, API client.
- AI-01: Align process-document contract.

### Phase 2: Upload & Processing

- BE-03: Upload Document/shared storage.
- BE-04: Auto-processing worker/AI client.
- FE-02/FE-06: Login + Upload screen.
- INFRA-01: Docker shared volume.

### Phase 3: My Documents & Review

- BE-05: My Documents API.
- BE-06: Admin review API.
- FE-05/FE-07: My Documents list/detail.
- FE-08/FE-09: Admin review UI.

### Phase 4: Library & RAG

- AI-02: Retrieval repository.
- AI-03: Answer question endpoint.
- BE-07: Library API.
- BE-08: RAG proxy API.
- FE-03/FE-04: Library + RAG UI.

### Phase 5: Integration & QA

- INT-01/INT-02: End-to-end integration.
- QA-01: Demo rehearsal.

---

## 14. Out-of-scope

Core MVP **không làm**:

- Student flow.
- Quiz attempt/result.
- Gamification, level, score.
- OCR.
- Parse DOCX/PPTX trực tiếp.
- RAG toàn thư viện không có phạm vi.
- SSE streaming.
- Queue phân tán.
- Cloud storage bắt buộc.
- Admin dashboard phức tạp.
- Tạo thêm Admin, đổi role hoặc quản lý Student.
- Xóa cứng tài khoản Teacher.
- AI tự công bố nội dung.

---

## 15. Tài liệu liên quan

| File | Mục đích |
|---|---|
| `01_PROJECT_PRD.md` | Yêu cầu nghiệp vụ |
| `02_MVP_IMPLEMENTATION_PLAN.md` | Kế hoạch triển khai chi tiết |
| `03_BE_AI_INTEGRATION.md` | Quyết định tích hợp Backend-AI |
| `04_AI_API_CONTRACT.md` | API contract nội bộ Backend-AI |
| `05_DATABASE_SCHEMA_CONTRACT.md` | Contract schema database |
| `06_AI_PIPELINE.md` | Thuật toán AI |
| `07_BACKEND_DATABASE_SCHEMA_GUIDE.md` | Hướng dẫn tạo migration |
| `15_QUIZ_API_BACKEND_SPEC.md` | Contract Backend cho sinh/xem/sửa/publish quiz |

---

## 16. Definition of Done

MVP đạt khi:

- Không còn bước bắt buộc tạo/chọn Course/Lecture trong demo.
- Teacher upload tài liệu và gắn metadata.
- AI tự động analyze tài liệu sau upload.
- Chunks/vector được lưu theo `document_id` sau khi Admin approve và index RAG.
- Teacher submit review được sau khi `ANALYZED`.
- Admin approve được.
- Document published xuất hiện trong Library.
- Teacher khác hỏi RAG trên document và nhận citation.
- Backend/AI/Frontend có test hoặc manual test evidence tối thiểu.
