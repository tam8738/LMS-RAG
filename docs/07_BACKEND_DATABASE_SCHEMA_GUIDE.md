# Hướng dẫn Backend tạo database schema MVP

**Phiên bản:** 1.0
**Cập nhật:** 07/07/2026
**Owner:** Backend
**Mục tiêu:** Tạo đầy đủ schema database cho MVP document-centric

File này dành cho Backend khi tạo migration database. Nội dung ở đây gom đầy đủ các bảng cần có cho MVP, bao gồm bảng nghiệp vụ Backend và bảng `document_chunks` mà AI Service sẽ ghi/truy vấn.

## 1. Nguyên tắc thiết kế

- `Document` là trung tâm của hệ thống.
- Không tạo luồng bắt buộc `Course -> Lecture -> Document`.
- `subject`, `topic`, `chapter`, `tags` là metadata của `documents`.
- Backend sở hữu migration và trạng thái nghiệp vụ.
- AI Service không tự tạo bảng; AI chỉ ghi/truy vấn `document_chunks` theo schema Backend tạo.
- Không tạo bảng thừa cho Student, quiz, gamification, enrollment hoặc LMS course trong MVP này.

## 2. Danh sách bảng cần có

Core MVP cần 4 bảng chính:

| Bảng | Owner logic | Mục đích |
|---|---|---|
| `users` | Backend | Tài khoản Admin/Teacher |
| `documents` | Backend | Tài liệu do Teacher upload, là bảng trung tâm |
| `document_processing_jobs` | Backend | Theo dõi mỗi lần xử lý AI/reprocess |
| `document_chunks` | AI ghi, Backend tạo migration | Lưu chunk text và embedding pgvector |

Không tạo trong MVP:

| Bảng | Lý do |
|---|---|
| `courses` | Dễ kéo hệ thống về LMS; subject chỉ là metadata |
| `lectures` | Không còn là bước bắt buộc trước upload |
| `course_members` | Không có enrollment/lớp học trong MVP mới |
| `quiz_attempts`, `quiz_results` | Student/quiz flow out-of-scope |
| `chat_sessions`, `chat_messages` | Lịch sử hỏi đáp là Should-have |
| `document_reviews` | MVP lưu review trực tiếp trong `documents` để đơn giản |
| `subjects` | Chưa cần bảng riêng; dùng text metadata trước |

## 3. Sơ đồ liên kết bảng

```txt
users.id
  ├── documents.uploaded_by
  └── documents.reviewed_by

users 1 ─── N documents
users 1 ─── N reviewed documents

documents.id
  ├── document_processing_jobs.document_id
  └── document_chunks.document_id

documents 1 ─── N document_processing_jobs
documents 1 ─── N document_chunks
```

Giải thích:

- Một Teacher có thể upload nhiều Document.
- Một Admin có thể review nhiều Document.
- Một Document có nhiều processing jobs vì có thể retry/reprocess.
- Một Document có nhiều chunks sau khi AI xử lý.
- Xóa Document thì xóa cascade jobs/chunks.
- Không xóa cascade từ `users` sang `documents` để tránh mất dữ liệu khi khóa tài khoản Teacher.

## 4. Thứ tự migration đề xuất

Nếu dùng Flyway:

```txt
backend/src/main/resources/db/migration/V1__create_users.sql
backend/src/main/resources/db/migration/V2__create_document_mvp.sql
backend/src/main/resources/db/migration/V3__seed_demo_users.sql
```

Nếu chưa dùng Flyway thì Backend vẫn nên tách SQL theo thứ tự trên để dễ review. Không nên chỉ dựa vào `spring.jpa.hibernate.ddl-auto=update` cho demo nhóm, vì cách đó khó kiểm soát constraint/index/pgvector.

Cấu hình nên đổi dần về:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

sau khi migration đã ổn định.

## 5. Migration V1 - users

Bảng `users` phục vụ đăng nhập JWT và phân quyền. Hiện code Backend đã có entity `User`, `UserRole`, `UserStatus`, nên schema cần khớp entity hiện tại.

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_users_role
        CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    CONSTRAINT ck_users_status
        CHECK (status IN ('ACTIVE', 'INACTIVE'))
);
```

Indexes:

```sql
CREATE UNIQUE INDEX uq_users_email
ON users(email);

CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_users_status
ON users(status);
```

Ghi chú:

- `password` lưu BCrypt hash, không lưu plain text.
- MVP chỉ cần Admin và Teacher. `STUDENT` có thể còn trong enum để tránh vỡ code cũ, nhưng không triển khai flow Student.
- Khi khóa Teacher, set `status = 'INACTIVE'`, không xóa user.

## 6. Migration V2 - pgvector extension

Cần tạo extension trước bảng `document_chunks`.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Yêu cầu PostgreSQL image/container phải hỗ trợ pgvector, ví dụ `pgvector/pgvector:pg16`.

## 7. Migration V2 - documents

`documents` là bảng trung tâm của MVP.

```sql
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,

    uploaded_by BIGINT NOT NULL
        REFERENCES users(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,

    subject VARCHAR(150),
    topic VARCHAR(255),
    chapter VARCHAR(100),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    file_version INT NOT NULL DEFAULT 1,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL,

    processing_status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    publication_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    error_code VARCHAR(50),
    error_message TEXT,
    processed_at TIMESTAMPTZ,

    reviewed_by BIGINT
        REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_documents_file_version
        CHECK (file_version > 0),
    CONSTRAINT ck_documents_file_size
        CHECK (file_size > 0),
    CONSTRAINT ck_documents_file_type
        CHECK (file_type IN ('PDF', 'TXT')),
    CONSTRAINT ck_documents_processing_status
        CHECK (processing_status IN (
            'UPLOADED', 'ANALYZING', 'PROCESSED', 'FAILED'
        )),
    CONSTRAINT ck_documents_publication_status
        CHECK (publication_status IN (
            'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'
        )),
    CONSTRAINT ck_documents_tags_array
        CHECK (jsonb_typeof(tags) = 'array')
);
```

Indexes:

```sql
CREATE INDEX idx_documents_uploaded_by
ON documents(uploaded_by);

CREATE INDEX idx_documents_reviewed_by
ON documents(reviewed_by);

CREATE INDEX idx_documents_subject
ON documents(subject);

CREATE INDEX idx_documents_topic
ON documents(topic);

CREATE INDEX idx_documents_processing_status
ON documents(processing_status);

CREATE INDEX idx_documents_publication_status
ON documents(publication_status);

CREATE INDEX idx_documents_library
ON documents(publication_status, published_at DESC)
WHERE publication_status = 'PUBLISHED';

CREATE INDEX idx_documents_tags_gin
ON documents USING gin(tags);
```

Vai trò các cột chính:

| Cột | Ý nghĩa |
|---|---|
| `uploaded_by` | Teacher tạo tài liệu |
| `subject/topic/chapter/tags` | Metadata phân loại, không phải LMS relation |
| `storage_key` | Đường dẫn tương đối để Backend/AI cùng tìm file |
| `file_version` | Tăng khi thay file/reprocess bằng file mới |
| `processing_status` | Trạng thái AI xử lý file |
| `publication_status` | Trạng thái duyệt/công bố |
| `reviewed_by/reviewed_at` | Admin duyệt hoặc từ chối |
| `published_at` | Thời điểm tài liệu vào Library |

## 8. Migration V2 - document_processing_jobs

Bảng này lưu lịch sử xử lý AI. Không dùng bảng này để quyết định quyền truy cập Library; quyền truy cập dựa vào `documents.publication_status`.

```sql
CREATE TABLE document_processing_jobs (
    id BIGSERIAL PRIMARY KEY,

    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    chunk_count INT,
    error_code VARCHAR(50),
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_processing_jobs_status
        CHECK (status IN ('PROCESSING', 'PROCESSED', 'FAILED')),
    CONSTRAINT ck_processing_jobs_chunk_count
        CHECK (chunk_count IS NULL OR chunk_count >= 0)
);
```

Indexes:

```sql
CREATE INDEX idx_processing_jobs_document
ON document_processing_jobs(document_id, created_at DESC);

CREATE UNIQUE INDEX uq_processing_jobs_active_document
ON document_processing_jobs(document_id)
WHERE status = 'PROCESSING';
```

Lý do có unique partial index:

- Một Document không nên có hai job `PROCESSING` cùng lúc.
- Vẫn cho phép nhiều job cũ đã `PROCESSED` hoặc `FAILED` để xem lịch sử.

## 9. Migration V2 - document_chunks

Bảng này do Backend tạo nhưng AI Service là nơi ghi và truy vấn chính.

```sql
CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,

    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    page_number INT,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    token_count INT NOT NULL,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_document_chunk_index
        UNIQUE (document_id, chunk_index),
    CONSTRAINT ck_document_chunks_page
        CHECK (page_number IS NULL OR page_number > 0),
    CONSTRAINT ck_document_chunks_index
        CHECK (chunk_index >= 0),
    CONSTRAINT ck_document_chunks_token_count
        CHECK (token_count > 0),
    CONSTRAINT ck_document_chunks_content
        CHECK (length(trim(content)) > 0)
);
```

Indexes:

```sql
CREATE INDEX idx_document_chunks_document
ON document_chunks(document_id);

CREATE INDEX idx_document_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
```

Ghi chú cho Backend:

- Không thêm `lecture_id` vào bảng này.
- Khi cần subject/topic/chapter trong citation hoặc filter, join từ `document_chunks.document_id` sang `documents.id`.
- AI reprocess sẽ delete/insert chunks theo `document_id` trong một transaction.


## 9A. Migration V4 - rag_status và analysis fields

Không sửa trực tiếp `V1/V2/V3` nếu database đã chạy. Khi refactor sang luồng mới, Backend tạo migration mới:

```txt
V4__add_rag_status_and_analysis_fields.sql
```

SQL tối thiểu:

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

ALTER TABLE documents
ADD CONSTRAINT ck_documents_rag_status
CHECK (rag_status IN (
    'NOT_ANALYZED',
    'READY_TO_INDEX',
    'UNSUPPORTED',
    'INDEXING',
    'READY',
    'FAILED'
));

ALTER TABLE documents
ADD CONSTRAINT ck_documents_page_count
CHECK (page_count IS NULL OR page_count >= 0),
ADD CONSTRAINT ck_documents_estimated_token_count
CHECK (estimated_token_count IS NULL OR estimated_token_count >= 0),
ADD CONSTRAINT ck_documents_estimated_chunk_count
CHECK (estimated_chunk_count IS NULL OR estimated_chunk_count >= 0);

CREATE INDEX idx_documents_rag_status
ON documents(rag_status);
```

Nếu giữ tên `PROCESSING` cũ trong `processing_status`, cần quyết định một trong hai hướng:

```txt
Hướng khuyến nghị: migrate PROCESSING -> ANALYZING và update check constraint.
Hướng tạm thời: cho phép cả PROCESSING và ANALYZING trong giai đoạn chuyển tiếp.
```

Khuyến nghị sau khi refactor hoàn tất:

```txt
processing_status: UPLOADED, ANALYZING, PROCESSED, FAILED
```

Có thể bổ sung `job_type` cho `document_processing_jobs`:

```sql
ALTER TABLE document_processing_jobs
ADD COLUMN job_type VARCHAR(30) NOT NULL DEFAULT 'INDEX';

ALTER TABLE document_processing_jobs
ADD CONSTRAINT ck_processing_jobs_type
CHECK (job_type IN ('ANALYZE', 'INDEX', 'REPROCESS'));

CREATE INDEX idx_processing_jobs_type_document
ON document_processing_jobs(document_id, job_type, created_at DESC);
```

Luồng trạng thái mới:

```txt
Upload -> ANALYZING -> PROCESSED + READY_TO_INDEX/UNSUPPORTED
Admin approve + READY_TO_INDEX -> INDEXING -> READY/FAILED
Admin approve + UNSUPPORTED -> PUBLISHED như tài liệu thường
```

## 10. Lưu ý Hibernate/JPA cho document_chunks

`document_chunks.embedding` dùng kiểu `VECTOR(1536)` của pgvector. Hibernate/JPA mặc định không hiểu tốt kiểu dữ liệu này, nên Backend không nên để Hibernate tự generate hoặc tự map bảng `document_chunks` trong MVP.

Quyết định cho MVP:

- Backend tạo bảng `document_chunks` bằng SQL migration.
- Backend không cần tạo `DocumentChunkEntity` trong Java.
- Backend không cần khai báo `@OneToMany` từ `Document` sang chunks.
- Bảng `documents` không có cột `chunk_id`, `chunk`, `chunks` hoặc field tương tự.
- Quan hệ đúng là `document_chunks.document_id -> documents.id`.
- Backend CRUD `Document` không bị ảnh hưởng vì chỉ thao tác bảng `documents` và `document_processing_jobs`.
- AI Service ghi/thay thế/truy vấn `document_chunks` bằng SQL/psycopg.

Nếu Backend cần biết số chunk của một Document, dùng:

```txt
document_processing_jobs.chunk_count
```

hoặc field tổng hợp do Backend cập nhật sau khi AI trả kết quả, không load toàn bộ chunks qua Hibernate.

Nếu sau MVP Backend thật sự cần đọc chunks, có hai hướng:

1. Dùng native query hoặc `JdbcTemplate` để đọc `document_chunks`.
2. Cài thêm thư viện hỗ trợ pgvector cho Hibernate rồi mới cân nhắc map `DocumentChunkEntity`.

Không nên làm trong MVP:

```java
@OneToMany(mappedBy = "document")
private List<DocumentChunk> chunks;
```

Lý do:

- Một Document có thể có rất nhiều chunks.
- Load chunks qua entity dễ nặng và không cần cho CRUD Document.
- Field `embedding VECTOR(1536)` làm mapping Hibernate phức tạp không cần thiết.
- AI Service mới là owner logic của chunks/vector.

## 11. Migration V3 - seed demo users

Seed tối thiểu cần có:

- 1 Admin.
- Ít nhất 2 Teacher để demo Teacher A upload và Teacher B xem Library/RAG.

Ví dụ SQL minh họa:

```sql
INSERT INTO users (email, password, name, role, status)
VALUES
    ('admin@example.com', '<bcrypt_hash_here>', 'Admin', 'ADMIN', 'ACTIVE'),
    ('teacher.a@example.com', '<bcrypt_hash_here>', 'Teacher A', 'TEACHER', 'ACTIVE'),
    ('teacher.b@example.com', '<bcrypt_hash_here>', 'Teacher B', 'TEACHER', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;
```

Không commit password thật hoặc hash không rõ nguồn vào repo public nếu nhóm xem đó là thông tin nhạy cảm. Với demo local, có thể thống nhất mật khẩu tạm như `123456` và ghi rõ chỉ dùng cho môi trường demo.

## 12. State transition cần Backend enforce

Database chỉ kiểm enum hợp lệ. Backend service phải kiểm transition hợp lệ.

Processing:

```txt
UPLOADED -> ANALYZING -> PROCESSED
                      -> FAILED
FAILED -> ANALYZING nếu analyze lại
```

Publication:

```txt
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
PENDING_REVIEW -> PUBLISHED
PENDING_REVIEW -> REJECTED
PUBLISHED -> ARCHIVED
```

Rule quan trọng:

- Chỉ submit review khi `processing_status = 'PROCESSED'`.
- Chỉ bật hỏi RAG khi `publication_status = 'PUBLISHED'` và `rag_status = 'READY'`.
- Document `rag_status = 'UNSUPPORTED'` vẫn được publish như tài liệu thường.
- Chỉ document `PUBLISHED` xuất hiện trong Library.
- Owner có thể RAG document của mình nếu `PROCESSED`.
- Teacher khác chỉ RAG document `PUBLISHED`.

## 13. Query mẫu Backend cần dùng

Library:

```sql
SELECT *
FROM documents
WHERE publication_status = 'PUBLISHED'
  AND (:subject IS NULL OR subject = :subject)
  AND (:topic IS NULL OR topic ILIKE '%' || :topic || '%')
ORDER BY published_at DESC
LIMIT :limit OFFSET :offset;
```

My Documents:

```sql
SELECT *
FROM documents
WHERE uploaded_by = :teacher_id
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

Admin review queue:

```sql
SELECT *
FROM documents
WHERE publication_status = 'PENDING_REVIEW'
ORDER BY updated_at ASC;
```

AI retrieval query:

```sql
SELECT
    dc.id AS chunk_id,
    dc.document_id,
    dc.page_number,
    dc.chunk_index,
    dc.content,
    d.title AS document_title,
    d.subject,
    d.topic,
    d.chapter,
    1 - (dc.embedding <=> CAST(:query_embedding AS vector)) AS score
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE dc.document_id = ANY(:document_ids)
ORDER BY dc.embedding <=> CAST(:query_embedding AS vector)
LIMIT :top_k;
```

## 14. Checklist để Backend tự kiểm tra

Sau khi chạy migration, Backend kiểm tra:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Phải thấy ít nhất:

```txt
users
documents
document_processing_jobs
document_chunks
```

Kiểm tra pgvector:

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
```

Kiểm tra FK:

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
```

Không được có FK từ `documents` hoặc `document_chunks` sang `courses/lectures` trong MVP mới. Không thêm cột `chunk_id` hoặc `chunks` trực tiếp vào `documents`; RAG dùng bảng riêng `document_chunks`.

## 15. Checklist bàn giao cho AI

Backend cần báo cho AI khi đã có:

- [ ] PostgreSQL chạy bằng image có pgvector.
- [ ] Extension `vector` đã được tạo.
- [ ] Bảng `documents` đã tồn tại.
- [ ] Bảng `document_chunks` đã tồn tại với `embedding VECTOR(1536)`.
- [ ] `document_chunks` chỉ có FK `document_id -> documents.id`.
- [ ] Có ít nhất một row `documents` thật để AI test insert chunks.
- [ ] Shared storage đã có file theo `storage_key`.

## 16. Kết luận cho Backend

Backend cần tạo đầy đủ schema nghiệp vụ, không chỉ bảng phục vụ AI. Bộ bảng tối thiểu, hợp lý và không thừa cho MVP mới là:

```txt
users
documents
document_processing_jobs
document_chunks
```

Trong đó:

- `users` phục vụ login/role/status.
- `documents` là trung tâm nghiệp vụ.
- `document_processing_jobs` theo dõi xử lý AI.
- `document_chunks` phục vụ retrieval/RAG bằng pgvector.

Không cần tạo `courses`, `lectures`, `course_members` cho luồng mới.