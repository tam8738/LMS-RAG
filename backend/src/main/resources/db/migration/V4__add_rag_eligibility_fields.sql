-- Add RAG eligibility fields to documents after AI validation.
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS rag_eligible BOOLEAN,
    ADD COLUMN IF NOT EXISTS page_count INT,
    ADD COLUMN IF NOT EXISTS estimated_token_count INT,
    ADD COLUMN IF NOT EXISTS estimated_chunk_count INT,
    ADD COLUMN IF NOT EXISTS unsupported_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- Expand processing_status to include ANALYZING.
ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS ck_documents_processing_status;

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_processing_status
        CHECK (processing_status IN (
            'UPLOADED', 'ANALYZING', 'ANALYZED', 'PROCESSING', 'PROCESSED', 'FAILED'
        ));

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_rag_eligible_null_or_bool
        CHECK (rag_eligible IS NULL OR rag_eligible IN (TRUE, FALSE));

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_page_count
        CHECK (page_count IS NULL OR page_count >= 0);

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_estimated_token_count
        CHECK (estimated_token_count IS NULL OR estimated_token_count >= 0);

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_estimated_chunk_count
        CHECK (estimated_chunk_count IS NULL OR estimated_chunk_count >= 0);

-- Add job_type to document_processing_jobs to distinguish analyze/index/reprocess.
ALTER TABLE document_processing_jobs
    ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) NOT NULL DEFAULT 'ANALYZE';

ALTER TABLE document_processing_jobs
    ADD CONSTRAINT ck_processing_jobs_type
        CHECK (job_type IN ('ANALYZE', 'INDEX', 'REPROCESS'));
