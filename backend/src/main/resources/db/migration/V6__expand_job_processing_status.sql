-- Expand document_processing_jobs.status to use the same AI status enum as documents.
-- This allows a job to be ANALYZING while the document is being lightly analyzed,
-- without misusing PROCESSING for the analyze phase.

ALTER TABLE document_processing_jobs
    DROP CONSTRAINT IF EXISTS ck_processing_jobs_status;

ALTER TABLE document_processing_jobs
    ADD CONSTRAINT ck_processing_jobs_status
        CHECK (status IN (
            'UPLOADED', 'ANALYZING', 'ANALYZED', 'PROCESSING', 'PROCESSED', 'FAILED'
        ));

-- Active jobs are now either ANALYZING (light analyze) or PROCESSING (RAG index).
-- Drop and recreate the partial unique index to enforce one active job per document.
DROP INDEX IF EXISTS uq_processing_jobs_active_document;

CREATE UNIQUE INDEX IF NOT EXISTS uq_processing_jobs_active_document
    ON document_processing_jobs(document_id)
    WHERE status = 'PROCESSING' OR status = 'ANALYZING';
