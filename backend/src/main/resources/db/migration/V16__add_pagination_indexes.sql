-- Supports the pending-review queue's equality filter and stable chronological pagination.
CREATE INDEX IF NOT EXISTS idx_documents_pending_review_updated
    ON documents(updated_at ASC, id ASC)
    WHERE publication_status = 'PENDING_REVIEW';
