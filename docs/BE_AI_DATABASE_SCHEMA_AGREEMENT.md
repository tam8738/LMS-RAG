# Thống nhất database schema cho Backend - AI

**Phiên bản:** 1.0  
**Ngày cập nhật:** 03/07/2026  
**Trạng thái:** Đã thống nhất

## 1. Nguyên tắc ownership

- Backend quản lý toàn bộ migration.
- Backend quản lý bảng nghiệp vụ và trạng thái document/job.
- AI Service ghi, thay thế và truy vấn `document_chunks`.
- AI Service không tự cập nhật bảng `documents`.
- Xóa document dùng foreign key cascade để xóa chunks.

## 2. Kiểu ID

MVP dùng:

```txt
PostgreSQL: BIGSERIAL/BIGINT
Java: Long
Python/JSON: int
```

Không dùng UUID cho các entity nghiệp vụ hiện tại.

## 3. Bật pgvector

Migration cần chạy:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 4. Bảng documents

Schema tối thiểu:

```sql
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    lecture_id BIGINT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    uploaded_by BIGINT NOT NULL REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    file_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    error_code VARCHAR(50),
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_documents_file_type
        CHECK (file_type IN ('PDF', 'TXT')),
    CONSTRAINT ck_documents_status
        CHECK (status IN ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'))
);
```

Thay `file_path` bằng hoặc chuẩn hóa sang `storage_key`.

Ví dụ:

```txt
documents/12/source.pdf
```

`storage_key` luôn là relative path dưới `UPLOAD_ROOT`.

## 5. Bảng document_processing_jobs

Backend quản lý job để Frontend polling.

```sql
CREATE TABLE document_processing_jobs (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    chunk_count INT,
    error_code VARCHAR(50),
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_document_processing_jobs_status
        CHECK (status IN ('PROCESSING', 'PROCESSED', 'FAILED'))
);

CREATE INDEX idx_processing_jobs_document_id
ON document_processing_jobs(document_id);
```

Backend tạo job trước khi gọi AI.

## 6. Bảng document_chunks

Schema đã thống nhất:

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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_chunk_index
        UNIQUE (document_id, chunk_index),
    CONSTRAINT ck_document_chunks_page_number
        CHECK (page_number IS NULL OR page_number > 0),
    CONSTRAINT ck_document_chunks_chunk_index
        CHECK (chunk_index >= 0),
    CONSTRAINT ck_document_chunks_token_count
        CHECK (token_count > 0)
);
```

Indexes:

```sql
CREATE INDEX idx_document_chunks_document_id
ON document_chunks(document_id);

CREATE INDEX idx_document_chunks_lecture_id
ON document_chunks(lecture_id);

CREATE INDEX idx_document_chunks_embedding_hnsw
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
```

Vector configuration:

```txt
Model: text-embedding-3-small
Dimensions: 1536
Similarity: cosine
```

Cosine distance query:

```sql
SELECT
    id,
    document_id,
    lecture_id,
    page_number,
    chunk_index,
    content,
    1 - (embedding <=> CAST(:query_embedding AS vector)) AS score
FROM document_chunks
WHERE lecture_id = :lecture_id
ORDER BY embedding <=> CAST(:query_embedding AS vector)
LIMIT :top_k;
```

## 7. Reprocess transaction

AI Service thực hiện:

```txt
parse -> clean -> chunk -> embed
```

Sau khi toàn bộ embedding đã sẵn sàng:

```sql
BEGIN;

DELETE FROM document_chunks
WHERE document_id = :document_id;

-- Batch insert chunks mới.

COMMIT;
```

Nếu insert lỗi:

```sql
ROLLBACK;
```

Chunks cũ được giữ nguyên sau rollback.

## 8. Xóa document

Backend:

1. Xóa file theo `storage_key`.
2. Xóa record `documents`.

Database cascade:

```txt
documents -> document_chunks
documents -> document_processing_jobs
```

Không cần gọi endpoint AI riêng để xóa chunks trong MVP.

## 9. Citation

Bảng citations nên có retrieval score:

```sql
CREATE TABLE citations (
    id BIGSERIAL PRIMARY KEY,
    chat_message_id BIGINT NOT NULL
        REFERENCES chat_messages(id) ON DELETE CASCADE,
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id BIGINT
        REFERENCES document_chunks(id) ON DELETE SET NULL,
    page_number INT,
    excerpt TEXT NOT NULL,
    score DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 10. Question source

Trong MVP, mỗi câu hỏi AI có thể lưu một nguồn chính:

```sql
ALTER TABLE questions
ADD COLUMN source_document_id BIGINT
    REFERENCES documents(id) ON DELETE SET NULL,
ADD COLUMN source_chunk_id BIGINT
    REFERENCES document_chunks(id) ON DELETE SET NULL,
ADD COLUMN source_page_number INT;
```

Nếu sau này cần nhiều nguồn cho một câu hỏi, tách thành bảng `question_sources`.

## 11. Question types

Giá trị thống nhất:

```txt
SINGLE_CHOICE
MULTIPLE_CHOICE
SHORT_ANSWER
```

`options.is_correct` dùng cho câu hỏi lựa chọn.

`questions.correct_answer_text` dùng làm đáp án mẫu cho `SHORT_ANSWER`.

## 12. Multiple choice answers

Mỗi option Student chọn được lưu thành một dòng `quiz_answers`.

Unique index:

```sql
CREATE UNIQUE INDEX uq_quiz_answer_selected_option
ON quiz_answers(attempt_id, question_id, selected_option_id)
WHERE selected_option_id IS NOT NULL;
```

Quy tắc:

- `SINGLE_CHOICE`: một selected option.
- `MULTIPLE_CHOICE`: nhiều selected option.
- `SHORT_ANSWER`: `selected_option_id` null, dùng `answer_text`.

## 13. Enum/status

Document:

```txt
UPLOADED
PROCESSING
PROCESSED
FAILED
```

Processing job:

```txt
PROCESSING
PROCESSED
FAILED
```

Summary/Quiz:

```txt
DRAFT
PUBLISHED
ARCHIVED
```

User/Course:

```txt
ACTIVE
INACTIVE
```

## 14. Việc Backend cần thực hiện

- [ ] Bổ sung migration pgvector.
- [ ] Tạo/cập nhật `documents`.
- [ ] Tạo `document_processing_jobs`.
- [ ] Tạo `document_chunks` với `VECTOR(1536)`.
- [ ] Bổ sung HNSW cosine index.
- [ ] Thêm cascade foreign keys.
- [ ] Thêm `score` cho citations.
- [ ] Thêm source metadata cho questions.
- [ ] Đồng bộ entity Java dùng `Long`.
- [ ] Đồng bộ enum/status.
- [ ] Cấu hình shared uploads volume.

## 15. Việc AI Service cần thực hiện

- [ ] Resolve và validate `storage_key`.
- [ ] Parse PDF/TXT.
- [ ] Clean text.
- [ ] Chunk và token count.
- [ ] Sinh embedding 1536 chiều.
- [ ] Batch insert chunks.
- [ ] Reprocess transaction.
- [ ] Retrieval cosine theo `lecture_id`.

