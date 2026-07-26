# Database schema contract cho core MVP

**Phiên bản:** 1.7
**Cập nhật:** 23/07/2026
**Owner migration:** Backend

File này là contract ngắn gọn về database schema của MVP document-centric. File này chốt bảng nào tồn tại, quan hệ chính, ownership và các rule dữ liệu bắt buộc.

SQL migration chi tiết, index, seed và checklist triển khai nằm ở:

```txt
07_BACKEND_DATABASE_SCHEMA_GUIDE.md
```

## 1. Nguyên tắc schema

- `Document` là trung tâm của hệ thống.
- Core MVP không phụ thuộc `courses`, `lectures` hoặc `course_members`.
- `subject`, `topic`, `chapter`, `tags` là metadata của `documents`.
- Backend là owner duy nhất của migration database.
- AI Service không tự tạo bảng; AI chỉ ghi/truy vấn `document_chunks` theo schema Backend tạo.
- PostgreSQL phải có extension `vector` để dùng pgvector.

## 2. Bảng core cần có

| Bảng | Bắt buộc | Owner logic | Mục đích |
|---|---:|---|---|
| `users` | Có | Backend | Tài khoản Admin/Teacher, login, role, status |
| `documents` | Có | Backend | Tài liệu do Teacher upload, bảng trung tâm nghiệp vụ |
| `document_processing_jobs` | Có | Backend | Theo dõi các lần AI process/reprocess |
| `document_chunks` | Có | AI ghi, Backend tạo migration | Lưu chunk text và embedding pgvector |
| `rag_conversations` | Có | Backend | Lưu conversation RAG per user per document |
| `rag_messages` | Có | Backend | Lưu user/assistant messages trong conversation |
| `quizzes` | Có | Backend | Lưu quiz draft/published do Teacher sinh từ document |
| `quiz_questions` | Có | Backend | Lưu câu hỏi, options, đáp án, giải thích và citations |

## 3. Bảng không thuộc core MVP

| Bảng | Lý do không tạo trong MVP mới |
|---|---|
| `courses` | Hướng mới không phải LMS; môn học là `documents.subject` |
| `lectures` | Không bắt Teacher tạo bài giảng trước khi upload |
| `course_members` | Không có enrollment/lớp học |
| `subjects` | Chưa cần bảng riêng; dùng text metadata trước |
| `document_reviews` | MVP lưu review trực tiếp trong `documents` |
| `chat_sessions`, `chat_messages` | Đã thay bằng `rag_conversations`/`rag_messages` cho RAG history resume |
| `quiz_attempts`, `quiz_results` | MVP hiện làm quiz public/xem kết quả ở Frontend; chưa lưu lượt làm, điểm hoặc xếp hạng vào DB |

Nếu code cũ còn entity/table `Course`, `Lecture`, `CourseMember`, chúng là dấu vết hướng LMS cũ và không được dùng làm dependency của Document MVP mới.

## 4. Quan hệ giữa các bảng

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

rag_conversations.id
  └── rag_messages.conversation_id

quizzes.id
  └── quiz_questions.quiz_id
```

Cardinality:

| Quan hệ | Ý nghĩa |
|---|---|
| `users 1 - N documents` | Một Teacher upload nhiều Document |
| `users 1 - N reviewed documents` | Một Admin review nhiều Document |
| `users 1 - N rag_conversations` | Một User có nhiều RAG conversation |
| `documents 1 - N document_processing_jobs` | Một Document có thể process/reprocess nhiều lần |
| `documents 1 - N document_chunks` | Một Document có nhiều chunks sau khi AI xử lý |
| `documents 1 - N rag_conversations` | Một Document có nhiều conversation (mỗi user một conversation) |
| `rag_conversations 1 - N rag_messages` | Một Conversation có nhiều messages |
| `users 1 - N quizzes` | Một Teacher có thể tạo nhiều Quiz |
| `documents 1 - N quizzes` | Một Document có thể được dùng để sinh nhiều Quiz |
| `quizzes 1 - N quiz_questions` | Một Quiz có nhiều câu hỏi |

Cascade rule:

- Xóa `documents` thì cascade xóa `document_processing_jobs`, `document_chunks`, `rag_conversations`
  và `quizzes` (sau đó cascade tiếp `quiz_questions`).
- Xóa `users` thì cascade xóa `rag_conversations`; không cascade xóa `documents`.
- Xóa `rag_conversations` thì cascade xóa `rag_messages`.
- Xóa `quizzes` thì cascade xóa `quiz_questions`; FK `quizzes.created_by` không cascade xóa quiz.
- `documents.reviewed_by` dùng `ON DELETE SET NULL` nếu reviewer bị xóa trong môi trường dev.

## 5. Quy ước kiểu dữ liệu

```txt
PostgreSQL ID: BIGINT/BIGSERIAL
Java ID: Long
Python/JSON ID: int
Timestamp: TIMESTAMPTZ
Embedding: VECTOR(1536)
Similarity: cosine
Tags: JSONB array
```

## 6. Contract bảng users

Các field bắt buộc:

| Cột | Kiểu | Rule |
|---|---|---|
| `id` | `BIGSERIAL` | Primary key |
| `email` | `VARCHAR(255)` | Not null, unique |
| `password` | `VARCHAR(255)` | BCrypt hash, not null |
| `name` | `VARCHAR(255)` | Not null |
| `role` | `VARCHAR(20)` | `ADMIN`, `TEACHER`, `STUDENT` |
| `status` | `VARCHAR(20)` | `ACTIVE`, `INACTIVE` |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

Core MVP dùng `ADMIN` và `TEACHER` cho luồng đăng nhập. `STUDENT` có thể còn trong enum để tránh vỡ code cũ, nhưng người học làm quiz public không cần tài khoản và chưa có flow Student đăng nhập.

## 7. Contract bảng documents

Các nhóm field bắt buộc:

| Nhóm | Cột |
|---|---|
| Ownership | `uploaded_by`, `reviewed_by` |
| Metadata | `title`, `description`, `subject`, `topic`, `chapter`, `tags` |
| File | `original_filename`, `stored_filename`, `storage_key`, `file_version`, `file_type`, `mime_type`, `file_size` |
| AI status | `processing_status`, `rag_eligible`, `page_count`, `estimated_token_count`, `estimated_chunk_count`, `unsupported_reason`, `analyzed_at`, `error_code`, `error_message`, `processed_at` |
| Review status | `publication_status`, `reviewed_at`, `rejection_reason`, `published_at` |
| Audit | `created_at`, `updated_at` |

Enum/rule bắt buộc:

```txt
file_type: PDF | TXT
processing_status: UPLOADED | ANALYZING | ANALYZED | PROCESSING | PROCESSED | FAILED
publication_status: DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED
tags: JSONB array
storage_key: unique relative path
file_version > 0
file_size > 0
```

Không được có:

```txt
lecture_id
course_id
```

trong `documents` của core MVP.

## 8. Contract bảng document_processing_jobs

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `document_id` | FK tới `documents.id`, cascade delete |
| `status` | `PROCESSING`, `PROCESSED`, `FAILED` |
| `job_type` | `ANALYZE`, `INDEX`, `REPROCESS` |
| `chunk_count` | Null hoặc >= 0 |
| `error_code`, `error_message` | Lưu lỗi AI nếu có |
| `started_at`, `completed_at`, `created_at`, `updated_at` | Audit/job timeline |

Rule bắt buộc:

- Chỉ một job `PROCESSING` active cho cùng một `document_id`.
- Dùng `job_type = ANALYZE` cho bước analyze nhẹ sau upload.
- Dùng `job_type = INDEX` cho bước tạo chunks/embedding sau approve.
- Không dùng `ANALYZING` làm `document_processing_jobs.status` nếu constraint job chỉ cho `PROCESSING/PROCESSED/FAILED`.
- Có thể giữ nhiều job cũ `PROCESSED`/`FAILED` để xem lịch sử.

## 9. Contract bảng document_chunks

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `document_id` | FK tới `documents.id`, cascade delete |
| `page_number` | Null hoặc > 0 |
| `chunk_index` | >= 0, unique theo `document_id` |
| `content` | Text không rỗng |
| `token_count` | > 0 |
| `embedding` | `VECTOR(1536)` |
| `created_at` | Timestamp |

Không được có:

```txt
lecture_id
course_id
```

trong `document_chunks` của core MVP.

Hibernate/JPA note: Backend không cần map `document_chunks` thành entity trong MVP. Bảng này được tạo bằng SQL migration; AI Service ghi/truy vấn bằng SQL. Chi tiết nằm trong `07_BACKEND_DATABASE_SCHEMA_GUIDE.md`.

AI Service reprocess chunks bằng transaction:

```txt
parse/chunk/embed xong
-> BEGIN
-> DELETE old chunks by document_id
-> INSERT new chunks
-> COMMIT
```

Nếu insert lỗi thì rollback, chunks cũ phải còn nguyên.

## 9.1. Contract bảng rag_conversations

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `user_id` | FK tới `users.id`, cascade delete |
| `document_id` | FK tới `documents.id`, cascade delete |
| `title` | Optional, VARCHAR(255) |
| `message_count` | INTEGER, NOT NULL, DEFAULT 0, >= 0 |
| `last_message_at` | TIMESTAMPTZ |
| `created_at` | TIMESTAMPTZ, NOT NULL |
| `updated_at` | TIMESTAMPTZ, NOT NULL |
| `deleted_at` | TIMESTAMPTZ, soft delete |

Rule bắt buộc:

- Unique constraint `(user_id, document_id)`.
- Một conversation cho mỗi cặp user + document trong v1.

## 9.2. Contract bảng rag_messages

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `conversation_id` | FK tới `rag_conversations.id`, cascade delete |
| `role` | VARCHAR(20), NOT NULL, CHECK `user` \| `assistant` |
| `content` | TEXT, NOT NULL |
| `not_found` | BOOLEAN, NOT NULL, DEFAULT FALSE |
| `citations_json` | JSONB, NOT NULL, DEFAULT `'[]'` |
| `tokens_used` | INTEGER, NOT NULL, DEFAULT 0, >= 0 |
| `error_code` | VARCHAR(100) |
| `created_at` | TIMESTAMPTZ, NOT NULL |

Rule bắt buộc:

- `citations_json` phải là JSON array.
- `not_found` chỉ có ý nghĩa với assistant message.
- `tokens_used` chỉ có ý nghĩa với assistant message.

## 9.3. Contract bảng quizzes

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `document_id` | FK tới `documents.id`, cascade delete |
| `created_by` | FK tới `users.id`, không cascade delete |
| `title` | VARCHAR(500), không null |
| `description` | TEXT, optional |
| `status` | `DRAFT` hoặc `PUBLISHED`, mặc định `DRAFT` |
| `question_count` | INTEGER, không null, >= 0 |
| `language` | VARCHAR(10), `vi` hoặc `en` theo validation Backend |
| `tokens_used` | INTEGER, không null, >= 0 |
| `published_at` | TIMESTAMPTZ, null khi còn draft |
| `created_at`, `updated_at` | TIMESTAMPTZ, không null |

Index bắt buộc: `(created_by, created_at DESC)` và `document_id`.

## 9.4. Contract bảng quiz_questions

Field/rule chính:

| Cột | Rule |
|---|---|
| `id` | Primary key |
| `quiz_id` | FK tới `quizzes.id`, cascade delete |
| `question_index` | INTEGER, unique theo `quiz_id` |
| `question_text` | TEXT, không null |
| `question_type` | V1 chỉ nhận `single_choice` |
| `options_json` | JSONB array, 2-4 option theo validation Backend |
| `correct_option_ids` | JSONB array, đúng một option ID tồn tại trong `options_json` |
| `explanation` | TEXT, optional ở database, được validate khi AI sinh/Teacher sửa |
| `citations_json` | JSONB array, mặc định `[]` |
| `created_at`, `updated_at` | TIMESTAMPTZ, không null |

Backend không khai báo `@OneToMany` từ `Quiz` sang `QuizQuestion`; câu hỏi được truy vấn bằng
`QuizQuestionRepository` theo `(quiz_id, question_index)`.

## 10. Retrieval contract

Core RAG chỉ retrieval theo `document_ids` đã được Backend kiểm quyền.

```txt
AI receives document_ids
-> query document_chunks where document_id in document_ids
-> join documents only to lấy title/subject/topic/chapter metadata nếu cần citation/context
```

Không retrieval toàn Library trong MVP. Không dùng `subject`, `topic`, `chapter`, `tags` thay cho permission scope.

## 11. State transition contract

Processing:

```txt
UPLOADED -> ANALYZING -> ANALYZED
                      -> FAILED

ANALYZED --Admin approve--> PROCESSING -> PROCESSED
                                      -> FAILED

FAILED/ANALYZED/PROCESSED -> ANALYZING nếu thay file/analyze lại
FAILED/PROCESSED -> PROCESSING nếu index lại
```

Publication:

```txt
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
PENDING_REVIEW -> PUBLISHED
PENDING_REVIEW -> REJECTED
PUBLISHED -> ARCHIVED
```

Quiz:

```txt
DRAFT -> PUBLISHED
```

Quiz `PUBLISHED` không được sửa hoặc publish lại. Backend service enforce owner và transition này.

Database chỉ kiểm enum hợp lệ. Backend service phải enforce transition và permission.

Rule nghiệp vụ bắt buộc:

- Chỉ submit review khi `processing_status = ANALYZED`.
- Chỉ `PUBLISHED` xuất hiện trong Library.
- `PROCESSED` nghĩa là đã index RAG xong và có thể hỏi RAG.
- Owner có thể RAG document của mình nếu `PROCESSED`.
- Teacher khác chỉ RAG document `PUBLISHED` và `PROCESSED`.

## 12. Nguồn SQL triển khai

File này không lặp lại toàn bộ SQL để tránh mâu thuẫn. Backend tạo migration theo file:

```txt
07_BACKEND_DATABASE_SCHEMA_GUIDE.md
```

Schema quiz được triển khai tại:

```txt
backend/src/main/resources/db/migration/V14__create_quiz_tables.sql
```

Trong đó có:

- SQL `CREATE TABLE` đầy đủ.
- Index.
- Seed demo users.
- Query kiểm tra FK/table/pgvector.
- Checklist bàn giao cho AI.
