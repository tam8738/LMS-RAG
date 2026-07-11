-- REF-02: add document analyze/index state for the new RAG flow.
-- Keep PROCESSING in processing_status during the transition so existing upload code remains compatible.

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS rag_status VARCHAR(30) NOT NULL DEFAULT 'NOT_ANALYZED',
    ADD COLUMN IF NOT EXISTS analysis_error_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS analysis_error_message TEXT,
    ADD COLUMN IF NOT EXISTS unsupported_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS page_count INT,
    ADD COLUMN IF NOT EXISTS estimated_token_count INT,
    ADD COLUMN IF NOT EXISTS estimated_chunk_count INT,
    ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rag_error_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS rag_error_message TEXT,
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS ck_documents_processing_status;

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_processing_status
        CHECK (processing_status IN (
            'UPLOADED', 'ANALYZING', 'PROCESSING', 'PROCESSED', 'FAILED'
        ));

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

CREATE INDEX IF NOT EXISTS idx_documents_rag_status
    ON documents(rag_status);

ALTER TABLE document_processing_jobs
    ADD COLUMN IF NOT EXISTS job_type VARCHAR(30) NOT NULL DEFAULT 'ANALYZE';

ALTER TABLE document_processing_jobs
    ADD CONSTRAINT ck_processing_jobs_type
        CHECK (job_type IN ('ANALYZE', 'INDEX', 'REPROCESS'));

CREATE INDEX IF NOT EXISTS idx_processing_jobs_type_document
    ON document_processing_jobs(document_id, job_type, created_at DESC);