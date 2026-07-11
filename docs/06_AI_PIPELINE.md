# AI Pipeline - Document Analyze, Index và RAG

**Phiên bản:** 1.5
**Cập nhật:** 11/07/2026

File này mô tả thuật toán AI sau REF-01. API chi tiết nằm trong `04_AI_API_CONTRACT.md`; database nằm trong `05_DATABASE_SCHEMA_CONTRACT.md`.

## 1. Vai trò của AI Service

AI Service không xử lý user/role/permission. Backend gửi `document_id`, `storage_key`, `file_type` và metadata phụ sau khi đã kiểm quyền.

Từ v1.5, AI tách thành 3 nhóm trách nhiệm:

```txt
analyze-document: kiểm tra nhẹ sau upload, không ghi chunks
index-document: chunk/embed/store sau Admin approve
answer-question: retrieval/RAG trên document đã READY
```

Endpoint cũ `/v1/process-document` đã có trong code hiện tại và có thể giữ tạm để test legacy. Hướng triển khai chính là `/v1/analyze-document` và `/v1/index-document`.

## 2. Analyze pipeline

Endpoint:

```txt
POST /v1/analyze-document
```

Mục tiêu:

```txt
Xác định tài liệu có thể dùng RAG hay không trước khi Teacher submit review.
```

Luồng:

```txt
request
-> internal auth
-> resolve storage_key dưới UPLOAD_ROOT
-> validate file tồn tại/type/size
-> parse nhẹ PDF/TXT
-> kiểm tra có text đọc được không
-> đếm page_count nếu có
-> estimate token_count/chunk_count
-> trả READY_TO_INDEX hoặc UNSUPPORTED
```

Analyze không làm:

```txt
không clean/chunk đầy đủ
không gọi embedding provider
không ghi document_chunks
không cập nhật bảng documents
```

Kết quả hỗ trợ RAG:

```txt
processing_status = PROCESSED
rag_status = READY_TO_INDEX
```

Kết quả không hỗ trợ RAG nhưng vẫn publish được:

```txt
processing_status = PROCESSED
rag_status = UNSUPPORTED
unsupported_reason = PDF_SCAN_NO_TEXT hoặc EMPTY_TEXT
```

PDF scan không OCR trong MVP. Nếu PDF không có text layer thì analyze trả `UNSUPPORTED`, không phải lỗi upload.

## 3. Index pipeline

Endpoint:

```txt
POST /v1/index-document
```

Mục tiêu:

```txt
Sau khi Admin approve, tạo chunks/embedding để tài liệu có thể hỏi RAG.
```

Luồng:

```txt
request
-> internal auth
-> resolve storage_key dưới UPLOAD_ROOT
-> validate file tồn tại/type/size
-> parse đầy đủ PDF/TXT
-> clean text
-> chunk theo token
-> sinh embedding
-> atomic replace document_chunks
-> trả READY + chunk_count
```

Atomic replace:

```txt
build toàn bộ chunks/embeddings trước transaction
-> BEGIN
-> DELETE FROM document_chunks WHERE document_id = ?
-> batch INSERT chunks mới
-> COMMIT
```

Nếu insert lỗi:

```txt
ROLLBACK
chunks cũ vẫn còn nguyên
AI trả error để Backend set rag_status = FAILED
```

## 4. Storage resolver

Input:

```txt
storage_key = documents/{document_id}/v{version}/source.{extension}
```

Rule:

- Path cuối phải nằm dưới `UPLOAD_ROOT`.
- Từ chối absolute path.
- Từ chối `..`, Windows drive, ký tự `:`.
- AI chỉ đọc file; Backend là bên ghi/xóa file.

## 5. Parser

### PDF

- Đọc text theo từng page.
- Giữ `page_number` để citation trỏ ngược được.
- Không OCR trong MVP.
- PDF scan không có text layer -> `UNSUPPORTED` ở analyze.

### TXT

- Đọc như một logical page.
- Detect/validate encoding ở mức đơn giản.
- Nếu text rỗng -> `UNSUPPORTED` hoặc `EMPTY_DOCUMENT` tùy file có còn publish được không.

## 6. Cleaning và chunking

Chỉ chạy đầy đủ trong `index-document`.

Cleaning:

- Chuẩn hóa khoảng trắng.
- Gộp dòng vỡ hợp lý.
- Bỏ trang trắng/nội dung rỗng.

Chunking:

```txt
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
```

Mỗi chunk có:

```txt
document_id
page_number
chunk_index
content
token_count
embedding
```

`chunk_index` liên tục từ 0 trong toàn document.

## 7. Embedding

Chỉ chạy trong `index-document`.

Mặc định:

```txt
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
EMBEDDING_BATCH_SIZE=64
```

Nếu `OPENAI_API_KEY` thiếu hoặc provider lỗi, AI trả error để Backend set:

```txt
rag_status = FAILED
rag_error_code/message = <error>
```

Document vẫn có thể `PUBLISHED`; chỉ RAG không sẵn sàng.

## 8. Retrieval và RAG answer

Endpoint:

```txt
POST /v1/answer-question
```

Backend chỉ gọi endpoint này khi:

```txt
publication_status = PUBLISHED
rag_status = READY
```

Luồng:

```txt
question
-> embed question
-> query pgvector trong document_ids được Backend cho phép
-> top_k chunks
-> compose extractive answer từ top chunks
-> citations từ row document_chunks thật
```

MVP hiện dùng extractive answer từ retrieved chunks. Nếu sau này thêm LLM generation, prompt vẫn chỉ được dùng retrieved context, không bù kiến thức ngoài.

## 9. Citation contract

Citation phải truy ngược được về row thật:

```txt
chunk_id
document_id
page_number
chunk_index
excerpt
score
```

Không tạo citation giả.

## 10. Error strategy

Analyze:

- File không tồn tại/type sai/quá size: error.
- PDF scan hoặc không đủ text: trả `rag_status = UNSUPPORTED` nếu tài liệu vẫn publish được.

Index:

- Provider/database lỗi: error.
- Backend giữ document `PUBLISHED` nhưng set `rag_status = FAILED`.

Answer:

- Không có chunks hoặc score dưới threshold: `not_found=true`.
- Không truy vấn document ngoài `document_ids`.

## 11. Test bắt buộc

Analyze tests:

- TXT có text -> READY_TO_INDEX.
- PDF có text -> READY_TO_INDEX.
- PDF scan/no text -> UNSUPPORTED.
- Invalid storage_key -> INVALID_INPUT.

Index tests:

- TXT/PDF tạo chunks và insert `document_chunks`.
- Reindex thay chunks cũ trong transaction.
- Provider/database lỗi không làm mất chunks cũ.

RAG tests:

- Retrieval chỉ trong `document_ids`.
- Citation đúng chunk/document/page.
- Không có chunks trả `not_found=true`.

## 12. Trạng thái hiện tại

Đã có trong code trước REF-01:

- Storage resolver/validator.
- PDF/TXT parser.
- Cleaning/chunking.
- Embedding provider.
- Repository lưu và retrieval pgvector.
- `/v1/process-document` legacy.
- `/v1/answer-question` MVP.

Trạng thái sau REF-03:

```txt
AI-04: DONE - đã thêm /v1/analyze-document
AI-05: TODO - thêm /v1/index-document
BE-04: Backend gọi analyze sau upload
BE-06: Backend gọi index sau Admin approve
BE-08: Backend RAG proxy chỉ gọi khi PUBLISHED + READY
```