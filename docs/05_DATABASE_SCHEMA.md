# Database schema cho core MVP

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
**Owner migration:** Backend

Đây là nguồn SQL duy nhất cho Document MVP. Backend quản lý migration; AI ghi
và truy vấn `document_chunks`.

## 1. Quy ước

```txt
PostgreSQL ID: BIGINT/BIGSERIAL
Java ID: Long
Python/JSON ID: int
Timestamp: TIMESTAMPTZ
Embedding: VECTOR(1536)
Similarity: cosine
```

`users`, `courses`, `lectures` phải tồn tại và dùng ID `BIGINT` trước migration
này.

## 2. Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 3. Documents

```sql
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    lecture_id BIGINT NOT NULL
        REFERENCES lectures(id) ON DELETE CASCADE,
    uploaded_by BIGINT NOT NULL
        REFERENCES users(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,
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
            'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'
        )),
    CONSTRAINT ck_documents_publication_status
        CHECK (publication_status IN (
            'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'
        ))
);
```

Indexes:

```sql
CREATE INDEX idx_documents_uploaded_by
ON documents(uploaded_by);

CREATE INDEX idx_documents_lecture_id
ON documents(lecture_id);

CREATE INDEX idx_documents_processing_status
ON documents(processing_status);

CREATE INDEX idx_documents_publication_status
ON documents(publication_status);

CREATE INDEX idx_documents_library
ON documents(publication_status, published_at DESC)
WHERE publication_status = 'PUBLISHED';
```

## 4. Processing jobs

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

## 5. Document chunks

```sql
CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    lecture_id BIGINT NOT NULL
        REFERENCES lectures(id) ON DELETE CASCADE,
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

CREATE INDEX idx_document_chunks_lecture
ON document_chunks(lecture_id);

CREATE INDEX idx_document_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
```

## 6. Retrieval query

Core RAG lọc theo `document_ids`, không theo toàn Library:

```sql
SELECT
    id AS chunk_id,
    document_id,
    page_number,
    chunk_index,
    content,
    1 - (embedding <=> CAST(:query_embedding AS vector)) AS score
FROM document_chunks
WHERE document_id = ANY(:document_ids)
ORDER BY embedding <=> CAST(:query_embedding AS vector)
LIMIT :top_k;
```

AI phải truyền `document_ids` đã được Backend kiểm permission.

## 7. Reprocess transaction

AI parse/chunk/embed xong trước khi mở transaction:

```sql
BEGIN;

DELETE FROM document_chunks
WHERE document_id = :document_id;

-- Batch insert chunks mới.

COMMIT;
```

Nếu delete/insert lỗi:

```sql
ROLLBACK;
```

Chunks cũ phải còn nguyên sau rollback.

## 8. Publication transition

Backend service thực thi:

```txt
DRAFT -> PENDING_REVIEW
REJECTED -> PENDING_REVIEW
PENDING_REVIEW -> PUBLISHED
PENDING_REVIEW -> REJECTED
PUBLISHED -> ARCHIVED
```

Không dùng database trigger cho state machine trong MVP. Service kiểm rule,
transaction và role.

## 9. Delete

Khi Backend xóa Document:

1. Kiểm ownership và trạng thái.
2. Xóa database row.
3. Foreign key cascade xóa jobs/chunks.
4. Xóa file vật lý theo `storage_key`.

Nếu cần ưu tiên consistency, Backend có thể xóa file sau khi transaction database
commit và log/retry khi file cleanup lỗi.

## 10. Không thuộc core schema

Chưa tạo trong core MVP:

- Chat session/history.
- Citation persistence.
- Summary.
- Question/quiz/attempt/result.
- Document version history table.

Citation được trả trực tiếp từ AI response. `file_version` chỉ dùng sinh
`storage_key`, chưa phải hệ thống versioning hoàn chỉnh.
