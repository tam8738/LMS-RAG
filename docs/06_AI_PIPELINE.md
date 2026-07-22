# AI pipeline cho Document MVP

**Phiên bản:** 1.7
**Cập nhật:** 22/07/2026
**Owner:** AI Service

File này chỉ mô tả thuật toán AI. API payload nằm trong
`04_AI_API_CONTRACT.md`; database nằm trong `05_DATABASE_SCHEMA_CONTRACT.md`.

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
- `POST /v1/analyze-document` kiểm tra tài liệu có thể RAG được không, không embedding và không ghi DB.
- `POST /v1/answer-question` retrieval theo `document_ids`, lọc threshold, gọi grounded LLM generation khi có context và trả citations.
- `POST /v1/index-document` đã có và dùng lại process pipeline để tạo chunks/embedding sau Admin approve.
- `POST /v1/process-document` vẫn được giữ làm endpoint legacy/tương thích trong giai đoạn chuyển tiếp.
- Grounded LLM generation provider cho answer tự nhiên hơn sau retrieval.
- Stateless history trong request để hỗ trợ câu hỏi nối tiếp.
- Unit/API mock tests và regression tests cho RAG/history/provider.
- `POST /v1/generate-quiz` sinh quiz draft dạng JSON từ chunks đã index, có explanation và citations thật để Teacher review.

## 2. Analyze pipeline

```txt
storage_key
-> resolve dưới UPLOAD_ROOT
-> validate file
-> parse PDF/TXT
-> clean text
-> chunk theo token để estimate
-> trả can_rag/rag_status/unsupported_reason
```

Analyze không gọi embedding provider và không ghi `document_chunks`. Nếu có text usable, `rag_status` mục tiêu là `READY_TO_INDEX`; nếu không có text usable, trả `UNSUPPORTED`.

## 3. Index pipeline

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

Trạng thái hiện tại: đã có repository `search_similar_chunks` và endpoint `/v1/answer-question`. MVP hiện hỗ trợ stateless multi-turn bằng `history` trong request, retrieval theo document scope, threshold filtering và grounded LLM generation từ retrieved chunks.

```txt
question + optional history
-> validate
-> build retrieval query
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
history: optional, tối đa 6 message user/assistant
```

Quy tắc:

- Bắt buộc filter `document_ids`.
- Không dùng `course_id` hoặc `lecture_id` làm scope retrieval.
- Subject/topic/chapter/tags chỉ là metadata lấy từ Document khi cần hiển thị.
- Không query toàn Library.
- Backend đã kiểm permission trước khi gọi.
- AI Service không lưu conversation; history được gửi stateless theo từng request.
- Khi có history, AI ghép history gần nhất với câu hỏi hiện tại để tạo retrieval query.
- Sort theo cosine distance.
- Trả score `1 - cosine_distance`.
- Không có chunks hoặc score dưới threshold thì not-found.

## 4. RAG answer

Trạng thái AI-09: `/v1/answer-question` hỗ trợ RAG nhiều lượt ở dạng stateless và grounded LLM generation. Service vẫn retrieval trước, chỉ gửi các chunks đã truy xuất cho generation provider. Citations vẫn lấy từ các row thật trong `document_chunks`, không để model tự tạo nguồn.

```txt
question + history
-> embed retrieval query
-> retrieve chunks by Backend-authorized document_ids
-> filter by similarity threshold
-> if no chunks: return not_found=true without generation
-> call generation provider with question + history + chunks
-> return natural answer + real citations + tokens_used
```

Required rules:

- Use only retrieved context.
- Do not add outside knowledge.
- If no chunk remains after threshold, return `not_found=true`.
- Do not create fake citations.
- Reply according to `language`.
- `tokens_used` uses provider usage when generation runs; remains `0` when not-found happens before generation.

## 5. Quiz draft generation

Trạng thái AI-QUIZ-01: `/v1/generate-quiz` đã có trong AI Service. Endpoint này không thay thế RAG chat; nó là API nội bộ để Backend gọi khi Teacher muốn sinh bộ câu hỏi ôn tập từ tài liệu đã được index.

```txt
document_ids
-> Backend kiểm quyền và trạng thái tài liệu trước
-> AI đọc các chunks đại diện trong document_chunks
-> gọi generation provider với yêu cầu JSON object
-> validate số câu, options, đáp án đúng, explanation
-> map source_chunk_ids về citations thật
-> trả quiz draft cho Backend/Frontend review
```

Input chính:

```txt
document_ids: 1-10 IDs
question_count: mặc định 5, tối đa 10
language: vi/en
max_context_chunks: mặc định QUIZ_CONTEXT_CHUNKS, tối đa 24
```

Quy tắc:

- V1 chỉ sinh `single_choice` để BE/FE dễ lưu, review và chấm điểm.
- Mỗi câu cần có 4 options A-D, một đáp án đúng và explanation ngắn dựa trên tài liệu.
- LLM không được tự tạo citation metadata. Provider chỉ cho model trả `source_chunk_ids`, sau đó AI Service map lại thành `chunk_id`, `document_id`, `page_number`, `chunk_index`, `excerpt` từ chunk thật.
- Nếu tài liệu chưa có chunks, trả `NO_CHUNKS_FOUND` và không gọi generation provider.
- Nếu JSON sai cấu trúc, sai số câu hoặc trỏ tới chunk ngoài context, trả `INVALID_OUTPUT`.

Boundary:

- AI Service không lưu quiz vào database nghiệp vụ.
- AI Service không public URL quiz.
- AI Service không tạo attempt/result, không chấm điểm, không xếp hạng sinh viên.
- Backend/Frontend chịu trách nhiệm Teacher review, chỉnh sửa, submit/public và trang làm quiz.
## 6. Citation

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

## 7. Not-found

Trả:

```txt
not_found=true
citations=[]
tokens_used=0 hoặc usage thực tế nếu đã gọi model
```

Ưu tiên không gọi generation model nếu retrieval chắc chắn không có context.

## 8. Security boundary

AI Service:

- Kiểm `X-Internal-Key`.
- Validate `storage_key` và input.
- Không xử lý JWT.
- Không kiểm Teacher/Admin.
- Không đọc/cập nhật `publication_status`.
- Tin rằng Backend đã kiểm permission của `document_ids`.

## 9. Test bắt buộc

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

### Quiz

- Chỉ sinh quiz từ chunks trong `document_ids` đã được Backend authorize.
- Output là JSON có cấu trúc, không Markdown.
- Mỗi câu có options, correct option, explanation và citation thật.
- Không có chunks thì không gọi provider.
- Provider trả chunk id ngoài context phải bị reject.

## 10. Current parser evidence

Pipeline parse/clean/chunk đã được thử với PDF tiếng Việt có text layer gồm 179
trang:

```txt
307 chunks
max chunk: 999 tokens
```

Đây chưa phải E2E đầy đủ vì lần test parser không gọi OpenAI và không lưu
PostgreSQL.

## 11. Should-have

Sau core RAG E2E:

- Summary một document.
- Summary endpoint riêng nếu cần tách khỏi RAG chat.
- Prompt/evaluation tuning.

Các phần này không chặn core MVP.