-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents: central entity of the MVP
CREATE TABLE IF NOT EXISTS documents (
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
            'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'
        )),
    CONSTRAINT ck_documents_publication_status
        CHECK (publication_status IN (
            'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'
        )),
    CONSTRAINT ck_documents_tags_array
        CHECK (jsonb_typeof(tags) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by
    ON documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by
    ON documents(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_documents_subject
    ON documents(subject);

CREATE INDEX IF NOT EXISTS idx_documents_topic
    ON documents(topic);

CREATE INDEX IF NOT EXISTS idx_documents_processing_status
    ON documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_documents_publication_status
    ON documents(publication_status);

CREATE INDEX IF NOT EXISTS idx_documents_library
    ON documents(publication_status, published_at DESC)
    WHERE publication_status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS idx_documents_tags_gin
    ON documents USING gin(tags);

-- Document processing jobs: track AI process/reprocess attempts
CREATE TABLE IF NOT EXISTS document_processing_jobs (
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

CREATE INDEX IF NOT EXISTS idx_processing_jobs_document
    ON document_processing_jobs(document_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_processing_jobs_active_document
    ON document_processing_jobs(document_id)
    WHERE status = 'PROCESSING';

-- Document chunks: written by AI Service, read for RAG retrieval
CREATE TABLE IF NOT EXISTS document_chunks (
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

CREATE INDEX IF NOT EXISTS idx_document_chunks_document
    ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops);
