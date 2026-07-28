-- Mở rộng danh sách loại file được hỗ trợ để bao gồm DOCX.
ALTER TABLE documents
    DROP CONSTRAINT ck_documents_file_type;

ALTER TABLE documents
    ADD CONSTRAINT ck_documents_file_type
        CHECK (file_type IN ('PDF', 'TXT', 'DOCX'));
