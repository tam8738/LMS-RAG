# AI pipeline cho Document MVP

**Phiên bản:** 1.4
**Cập nhật:** 07/07/2026
**Owner:** AI Service

File này chỉ mô tả thuật toán AI. API payload nằm trong
`04_AI_API_CONTRACT.md`; database nằm trong `05_DATABASE_SCHEMA.md`.

## 1. Trạng thái hiện tại

Đã có:

- Internal key dependency.
- Storage resolver và document validator.
- PDF/TXT parser.
- Text cleaner và tokenizer.
- Chunker có overlap.
- OpenAI embedding provider.
- PostgreSQL repository atomic replace.
- Retrieval repository đọc `document_chunks` theo `document_ids` bằng pgvector cosine distance.
- `POST /v1/process-document` cần theo contract v1.4, không dùng `lecture_id`.
- Unit/API mock tests.

Chưa có:

- E2E thật Backend -> shared file -> OpenAI -> pgvector.
- RAG answer và citation.

## 2. Process pipeline

```txt
storage_key
-> resolve dưới UPLOAD_ROOT
-> validate file
-> parse PDF/TXT
-> clean text
-> chunk theo token
-> embedding
-> atomic replace document_chunks
-> trả page_count/chunk_count
```

### Resolve

- Chỉ nhận relative path dùng `/`.
- Chặn absolute path, Windows drive, `:`, `\` và `..`.
- Path cuối phải nằm dưới `UPLOAD_ROOT`.

### Validate

- File tồn tại.
- Loại khai báo khớp extension/signature.
- PDF/TXT.
- Tối đa 20 MB.
- TXT có encoding hợp lệ.

### Parse

PDF:

- Dùng PyMuPDF.
- Trích text theo page.
- Giữ `page_number` bắt đầu từ 1.
- PDF scan không có text trả `EMPTY_DOCUMENT`.

TXT:

- Đọc text theo encoding đã validate.
- `page_number=null`.
- Toàn file là một logical page trước chunking.

### Clean

- Chuẩn hóa line ending.
- Loại control characters không hợp lệ.
- Chuẩn hóa whitespace.
- Giữ paragraph và code structure cần thiết.
- Không viết lại hoặc tóm tắt nội dung gốc.

### Chunk

Config mặc định:

```txt
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
```

Ưu tiên điểm cắt:

```txt
paragraph
-> sentence
-> newline
-> whitespace
-> hard cut
```

Mỗi chunk có:

```txt
chunk_index
page_number
content
token_count
```

`chunk_index` liên tục từ 0 trong toàn document.

### Embedding

Core config:

```txt
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

- Gửi theo batch.
- Retry có giới hạn.
- Validate số vector, dimensions và finite values.

### Persistence

- Build toàn bộ embeddings trước transaction.
- Delete chunks cũ và batch insert chunks mới trong một transaction.
- Insert lỗi phải rollback cả delete.
- Unique `(document_id, chunk_index)`.

## 3. Retrieval pipeline

Trạng thái AI-02: đã có repository `search_similar_chunks` để query `document_chunks` theo `document_ids`. Endpoint HTTP `/v1/answer-question` và bước generation vẫn thuộc AI-03.

```txt
question
-> validate
-> query embedding
-> vector search trong document_ids
-> top_k chunks
-> similarity threshold
-> retrieved context
```

Input:

```txt
document_ids: 1-10 IDs
question
top_k: mặc định 5
language
```

Quy tắc:

- Bắt buộc filter `document_ids`.
- Không dùng `course_id` hoặc `lecture_id` làm scope retrieval.
- Subject/topic/chapter/tags chỉ là metadata lấy từ Document khi cần hiển thị.
- Không query toàn Library.
- Backend đã kiểm permission trước khi gọi.
- Sort theo cosine distance.
- Trả score `1 - cosine_distance`.
- Không có chunks hoặc score dưới threshold thì not-found.

## 4. RAG answer

```txt
retrieved chunks
-> build context có source markers
-> generation prompt
-> answer
-> map source markers về citations
```

Prompt phải yêu cầu:

- Chỉ dùng context.
- Không tự bổ sung kiến thức ngoài tài liệu.
- Nếu thiếu dữ liệu, nói không tìm thấy.
- Không tạo citation không tồn tại.
- Trả lời theo `language`.

## 5. Citation

Mỗi citation:

```txt
chunk_id
document_id
page_number
excerpt
score
```

`excerpt` lấy từ chunk thực tế, không do model tự viết. Citation phải truy ngược
được về row `document_chunks`.

## 6. Not-found

Trả:

```txt
not_found=true
citations=[]
tokens_used=0 hoặc usage thực tế nếu đã gọi model
```

Ưu tiên không gọi generation model nếu retrieval chắc chắn không có context.

## 7. Security boundary

AI Service:

- Kiểm `X-Internal-Key`.
- Validate `storage_key` và input.
- Không xử lý JWT.
- Không kiểm Teacher/Admin.
- Không đọc/cập nhật `publication_status`.
- Tin rằng Backend đã kiểm permission của `document_ids`.

## 8. Test bắt buộc

### Process

- PDF nhiều trang và TXT.
- File rỗng, sai signature, quá size.
- Path traversal.
- Chunk index/token/overlap.
- Embedding dimensions.
- Atomic rollback.
- E2E thật lưu pgvector.

### Retrieval

- Chỉ trả chunks trong `document_ids`.
- Không rò chunk của document khác.
- Top-k và score đúng.
- Empty document list/input không hợp lệ.
- Không có chunks trả not-found.

### RAG

- Answer bám retrieved context.
- Citation đúng chunk/document/page.
- Không citation giả.
- Internal key sai trả `401`.
- Provider timeout/database error dùng đúng error envelope.

## 9. Current parser evidence

Pipeline parse/clean/chunk đã được thử với PDF tiếng Việt có text layer gồm 179
trang:

```txt
307 chunks
max chunk: 999 tokens
```

Đây chưa phải E2E đầy đủ vì lần test parser không gọi OpenAI và không lưu
PostgreSQL.

## 10. Should-have

Sau core RAG E2E:

- Summary một document.
- Question generation từ selected documents.
- Prompt/evaluation tuning.

Các phần này không chặn core MVP.
