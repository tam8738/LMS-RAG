-- Update processing_status enum values to support the new RAG flow:
-- UPLOADED -> ANALYZING -> ANALYZED -> (approve) -> PROCESSING -> PROCESSED.

ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS ck_documents_processing_status;

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_processing_status
        CHECK (processing_status IN (
            'UPLOADED', 'ANALYZING', 'ANALYZED', 'PROCESSING', 'PROCESSED', 'FAILED'
        ));
