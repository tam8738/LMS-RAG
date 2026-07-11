# Database schema contract cho core MVP

**Phiên bản:** 1.6
**Cập nhật:** 11/07/2026
**Owner migration:** Backend

File này là contract ngắn gọn về database schema của MVP document-centric sau REF-01. Hướng mới tách rõ:

```txt
processing_status = trạng thái phân tích tài liệu sau upload
publication_status = trạng thái kiểm duyệt/công bố
rag_status = trạng thái khả năng RAG và lập chỉ mục vector
```

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
- Tài liệu không hỗ trợ RAG vẫn có thể được kiểm duyệt và publish như tài liệu thường.

## 2. Bảng core cần có

| Bảng | Bắt buộc | Owner logic | Mục đích |
|---|---:|---|---|
| `users` | Có | Backend | Tài khoản Admin/Teacher, login, role, status |
| `documents` | Có | Backend | Tài liệu do Teacher upload, bảng trung tâm nghiệp vụ |
| `document_processing_jobs` | Có | Backend | Theo dõi các lần analyze/index/reprocess |
| `document_chunks` | Có | AI ghi, Backend tạo migration | Lưu chunk text và embedding pgvector khi `rag_status = READY` |

## 3. Bảng không thuộc core MVP

| Bảng | Lý do không tạo trong MVP mới |
|---|---|
| `courses` | Hướng mới không phải LMS; môn học là `documents.subject` |
| `lectures` | Không bắt Teacher tạo bài giảng trước khi upload |
| `course_members` | Không có enrollment/lớp học |
| `subjects` | Chưa cần bảng riêng; dùng text metadata trước |
| `document_reviews` | MVP lưu review trực tiếp trong `documents` |
| `chat_sessions`, `chat_messages` | Lịch sử hỏi đáp là Should-have |
| `quiz_attempts`, `quiz_results` | Student/quiz flow out-of-scope |

## 4. Quan hệ giữa các bảng

```txt
users.id
  -> documents.uploaded_by
  -> documents.reviewed_by

documents.id
  -> document_processing_jobs.document_id
  -> document_chunks.document_id
```

Cardinality:

| Quan hệ | Ý nghĩa |
|---|---|
| `users 1 - N documents` | Một Teacher upload nhiều Document |
| `users 1 - N reviewed documents` | Một Admin review nhiều Document |
| `documents 1 - N document_processing_jobs` | Một Document có thể có nhiều job analyze/index/reprocess |
| `documents 1 - N document_chunks` | Một Document có nhiều chunks sau khi index RAG thành công |

Cascade rule:

- Xóa `documents` thì cascade xóa `document_processing_jobs` và `document_chunks`.
- Không cascade xóa `documents` khi xóa/khóa `users`; MVP nên khóa tài khoản bằng `users.status = 'INACTIVE'`.
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

Core MVP chỉ dùng `ADMIN` và `TEACHER`. `STUDENT` có thể còn trong enum để tránh vỡ code cũ nhưng không triển khai flow.

## 7. Contract bảng documents

Các nhóm field bắt buộc:

| Nhóm | Cột |
|---|---|
| Ownership | `uploaded_by`, `reviewed_by` |
| Metadata | `title`, `description`, `subject`, `topic`, `chapter`, `tags` |
| File | `original_filename`, `stored_filename`, `storage_key`, `file_version`, `file_type`, `mime_type`, `file_size` |
| Processing/analyze | `processing_status`, `analysis_error_code`, `analysis_error_message`, `unsupported_reason`, `page_count`, `estimated_token_count`, `estimated_chunk_count`, `analyzed_at` |
| RAG/index | `rag_status`, `rag_error_code`, `rag_error_message`, `indexed_at` |
| Review/publication | `publication_status`, `reviewed_at`, `rejection_reason`, `published_at` |
| Audit | `created_at`, `updated_at` |

Enum/rule bắt buộc:

```txt
file_type: PDF | TXT
processing_status: UPLOADED | ANALYZING | PROCESSED | FAILED
publication_status: DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED
rag_status: NOT_ANALYZED | READY_TO_INDEX | UNSUPPORTED | INDEXING | READY | FAILED
tags: JSONB array
storage_key: unique relative path
file_version > 0
file_size > 0
page_count null hoặc >= 0
estimated_token_count null hoặc >= 0
estimated_chunk_count null hoặc >= 0
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
| `job_type` | `ANALYZE`, `INDEX`, `REPROCESS` |
| `status` | `PROCESSING`, `PROCESSED`, `FAILED` |
| `chunk_count` | Null hoặc >= 0 |
| `error_code`, `error_message` | Lưu lỗi AI nếu có |
| `started_at`, `completed_at`, `created_at`, `updated_at` | Audit/job timeline |

Rule bắt buộc:

- Chỉ một job `PROCESSING` active cho cùng một `document_id` và `job_type`.
- Có thể giữ nhiều job cũ `PROCESSED`/`FAILED` để xem lịch sử.
- Analyze job không ghi chunks.
- Index job mới ghi/thay thế chunks qua AI Service.

Nếu muốn giảm scope migration trước mắt, `job_type` có thể bổ sung ở V4; không cần tạo bảng mới.

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

AI Service index chunks bằng transaction:

```txt
parse/chunk/embed xong
-> BEGIN
-> DELETE old chunks by document_id
-> INSERT new chunks
-> COMMIT
```

Nếu insert lỗi thì rollback, chunks cũ phải còn nguyên.

## 10. Retrieval contract

Core RAG chỉ retrieval theo `document_ids` đã được Backend kiểm quyền.

```txt
Backend chỉ gửi document_ids có publication_status = PUBLISHED và rag_status = READY
AI query document_chunks where document_id in document_ids
AI join documents chỉ khi cần metadata cho citation/context
```

Không retrieval toàn Library trong MVP. Không dùng `subject`, `topic`, `chapter`, `tags` thay cho permission scope.

## 11. State transition contract

Processing/analyze:

```txt
UPLOADED -> ANALYZING -> PROCESSED
                     -> FAILED
FAILED -> ANALYZING nếu analyze lại
```

RAG/index:

```txt
NOT_ANALYZED -> READY_TO_INDEX
NOT_ANALYZED -> UNSUPPORTED
READY_TO_INDEX --Admin approve--> INDEXING -> READY
READY_TO_INDEX --Admin approve--> INDEXING -> FAILED
FAILED -> INDEXING nếu retry index
UNSUPPORTED giữ nguyên, document vẫn có thể PUBLISHED như tài liệu thường
```

Publication:

```txt
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
PENDING_REVIEW -> PUBLISHED
PENDING_REVIEW -> REJECTED
PUBLISHED -> ARCHIVED
```

Database chỉ kiểm enum hợp lệ. Backend service phải enforce transition và permission.

Rule nghiệp vụ bắt buộc:

- Chỉ submit review khi `processing_status = PROCESSED`.
- Chỉ `PUBLISHED` xuất hiện trong Library.
- Nút hỏi RAG chỉ bật khi `publication_status = PUBLISHED` và `rag_status = READY`.
- Document `UNSUPPORTED` vẫn được publish và xem như tài liệu thường, nhưng không có RAG.
- Document `INDEXING` hiển thị trong Library với trạng thái “Đang chuẩn bị RAG”.

## 12. Migration V4 bắt buộc cho refactor

Không sửa trực tiếp `V1/V2/V3` nếu DB đã chạy. Tạo migration mới:

```txt
V4__add_rag_status_and_analysis_fields.sql
```

Tối thiểu cần làm:

```sql
ALTER TABLE documents
ADD COLUMN rag_status VARCHAR(30) NOT NULL DEFAULT 'NOT_ANALYZED',
ADD COLUMN analysis_error_code VARCHAR(50),
ADD COLUMN analysis_error_message TEXT,
ADD COLUMN unsupported_reason VARCHAR(100),
ADD COLUMN page_count INT,
ADD COLUMN estimated_token_count INT,
ADD COLUMN estimated_chunk_count INT,
ADD COLUMN analyzed_at TIMESTAMPTZ,
ADD COLUMN rag_error_code VARCHAR(50),
ADD COLUMN rag_error_message TEXT,
ADD COLUMN indexed_at TIMESTAMPTZ;
```

Cần cập nhật/check constraint cho:

```txt
processing_status: thêm ANALYZING, bỏ hoặc migrate PROCESSING nếu không còn dùng cho analyze
rag_status: NOT_ANALYZED, READY_TO_INDEX, UNSUPPORTED, INDEXING, READY, FAILED
```

Có thể bổ sung:

```sql
ALTER TABLE document_processing_jobs
ADD COLUMN job_type VARCHAR(30) NOT NULL DEFAULT 'INDEX';
```

## 13. Nguồn SQL triển khai

File này không lặp lại toàn bộ SQL để tránh mâu thuẫn. Backend tạo migration theo file:

```txt
07_BACKEND_DATABASE_SCHEMA_GUIDE.md
```

Trong đó có:

- SQL `CREATE TABLE` đầy đủ.
- Migration V4 cho refactor.
- Index.
- Seed demo users.
- Query kiểm tra FK/table/pgvector.
- Checklist bàn giao cho AI.