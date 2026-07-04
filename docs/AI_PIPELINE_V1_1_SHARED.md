# AI Processing Pipeline

**Phiên bản:** 1.1  
**Ngày cập nhật:** 03/07/2026  
**Trạng thái:** Đã thống nhất giữa Backend và AI

## 1. Phạm vi

Pipeline AI trong MVP gồm:

```txt
Resolve file
-> Validate
-> Parse PDF/TXT
-> Clean text
-> Chunk
-> Embedding
-> Lưu pgvector
-> Retrieval
-> RAG/Summary/Question generation
```

Không gồm:

- OCR.
- PDF scan không có text.
- PPTX/DOCX trực tiếp.
- Queue ngoài.
- SSE streaming.
- Chấm tự động `SHORT_ANSWER`.

## 2. Luồng upload và xử lý

```txt
Frontend
  |
  | multipart/form-data
  v
Backend
  |
  | validate PDF/TXT, max 20MB
  | lưu shared volume
  | tạo Document: UPLOADED
  v
Shared uploads volume
  |
  | storage_key
  v
Backend processing job
  |
  | Document/Job: PROCESSING
  | POST /v1/process-document
  v
AI Service
  |
  | parse -> clean -> chunk -> embed
  | transaction replace document_chunks
  v
Backend
  |
  | PROCESSED hoặc FAILED
  v
Frontend polling Backend job
```

## 3. Trách nhiệm Backend

Backend:

- Nhận multipart từ Frontend.
- Validate MIME/type/size.
- Lưu file vào shared volume.
- Sinh `storage_key`.
- Tạo và cập nhật `documents`.
- Tạo và cập nhật `document_processing_jobs`.
- Gọi AI bằng internal key.
- Cập nhật trạng thái sau response AI.
- Xóa file vật lý khi xóa document.
- Kiểm tra quyền Teacher/Student.

Backend không:

- Parse/chunk/embed.
- Ghi trực tiếp chunks trong flow bình thường.
- Cho Frontend gọi AI trực tiếp.

## 4. Trách nhiệm AI Service

AI Service:

- Kiểm tra `X-Internal-Key`.
- Resolve `storage_key` dưới `UPLOAD_ROOT`.
- Validate lại file.
- Parse PDF/TXT. PDF hiện dùng PyMuPDF để tái tạo text theo vị trí glyph và
  giảm lỗi vỡ từ trên tài liệu tiếng Việt có layout phức tạp.
- Clean text.
- Chunk và gắn metadata.
- Sinh embedding.
- Ghi/thay thế `document_chunks`.
- Retrieval vector.
- Sinh RAG answer, summary và question/quiz.

AI Service không:

- Quản lý user/JWT.
- Kiểm tra ownership course.
- Cập nhật `documents.status`.
- Quản lý processing job.
- Tự publish summary/quiz.

### Ghi chú kiểm thử parser thực tế ngày 04/07/2026

Pipeline `resolve -> validate -> parse -> clean -> chunk` đã được chạy với một
PDF có text layer gồm 179 trang. Kết quả tạo 307 chunks, chunk lớn nhất 999
token và không còn các mẫu vỡ từ đã ghi nhận như `nh\nững`, `liệ u`, `đ ược`.
Đây chưa phải E2E đầy đủ vì lần kiểm tra này không gọi OpenAI và không lưu
PostgreSQL/pgvector. PDF scan vẫn cần OCR và nằm ngoài MVP.

## 5. Shared storage

Biến môi trường:

```env
UPLOAD_ROOT=/storage/uploads
```

Storage key:

```txt
documents/{document_id}/source.{extension}
```

Ví dụ:

```txt
documents/12/source.pdf
```

Validation bắt buộc:

- Không nhận absolute path.
- Không nhận `..`.
- Resolved path phải nằm dưới `UPLOAD_ROOT`.
- File phải tồn tại và là regular file.
- Extension và magic/MIME phải phù hợp.
- Size không vượt quá 20MB.

## 6. Parse PDF

Input:

```txt
Path tới PDF đã validate
```

Output:

```json
[
  {
    "page_number": 1,
    "content": "Nội dung trang 1"
  }
]
```

Quy tắc:

- Giữ số trang bắt đầu từ 1.
- Bỏ page rỗng khỏi content nhưng vẫn ghi nhận tổng số trang.
- Nếu toàn bộ PDF không có text, trả `EMPTY_DOCUMENT`.
- PDF parser lỗi trả `PARSER_ERROR`.
- Không OCR.

## 7. Parse TXT

Output:

```json
[
  {
    "page_number": null,
    "content": "Nội dung TXT"
  }
]
```

Quy tắc:

- Ưu tiên UTF-8/UTF-8-SIG.
- File rỗng sau trim trả `EMPTY_DOCUMENT`.
- Encoding không hỗ trợ trả `PARSER_ERROR`.

## 8. Clean text

Clean text:

- Chuẩn hóa line ending về `\n`.
- Chuẩn hóa whitespace.
- Giảm nhiều dòng trống liên tiếp.
- Loại ký tự điều khiển không cần thiết.
- Giữ paragraph.
- Giữ code, công thức và keyword kỹ thuật.
- Không dịch, tóm tắt hoặc viết lại nội dung.

## 9. Chunking

Cấu hình:

```env
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
```

Quy tắc:

- Kích thước tính theo token.
- Ưu tiên cắt tại paragraph/sentence boundary.
- Không tạo chunk rỗng.
- `chunk_index` bắt đầu từ 0 và tăng liên tục trong document.
- Giữ `page_number` khi có.
- Nếu chunk chứa nội dung từ nhiều trang, metadata phải có trang bắt đầu hoặc danh sách trang theo implementation thống nhất.

Output:

```json
{
  "document_id": 12,
  "lecture_id": 5,
  "page_number": 3,
  "chunk_index": 7,
  "content": "Nội dung chunk",
  "token_count": 842
}
```

## 10. Embedding

Cấu hình:

```env
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

Quy tắc:

- Batch embedding.
- Retry giới hạn cho lỗi tạm thời.
- Không retry vô hạn.
- Kiểm tra số lượng vector bằng số lượng chunks.
- Kiểm tra mỗi vector đúng 1536 chiều.
- Provider lỗi trả `PROVIDER_UNAVAILABLE` hoặc `EMBEDDING_ERROR`.

## 11. Persistence

AI ghi:

```txt
document_chunks
```

Reprocess:

```txt
1. Parse/clean/chunk/embed hoàn tất ngoài transaction.
2. BEGIN.
3. DELETE chunks cũ theo document_id.
4. Batch INSERT chunks mới.
5. COMMIT.
6. Lỗi thì ROLLBACK.
```

Không xóa chunks cũ trước khi embedding mới hoàn tất.

## 12. Process response

Success:

```json
{
  "success": true,
  "data": {
    "document_id": 12,
    "lecture_id": 5,
    "status": "PROCESSED",
    "page_count": 12,
    "chunk_count": 48
  }
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "PARSER_ERROR",
    "message": "Không thể đọc học liệu",
    "details": []
  }
}
```

Backend dùng response để cập nhật document/job status.

## 13. Retrieval

Input:

```txt
lecture_id + question + top_k
```

Quy tắc:

- Sinh embedding câu hỏi cùng model/dimensions với chunks.
- Filter bắt buộc theo `lecture_id`.
- Dùng cosine similarity.
- `top_k` mặc định 5, giới hạn 3-8.
- Không retrieve chunks của lecture khác.

## 14. RAG answer

MVP trả JSON, không SSE.

Nguyên tắc:

- Chỉ trả lời từ retrieved context.
- Thiếu context trả `not_found=true`.
- Trả citations.
- Không tự bổ sung kiến thức ngoài học liệu.

## 15. Summary

Summary type:

```txt
OVERVIEW
STUDY_REVIEW
```

Chỉ sinh khi lecture có chunks.

AI trả content; Backend lưu `DRAFT`.

## 16. Question/Quiz

Loại câu hỏi:

```txt
SINGLE_CHOICE
MULTIPLE_CHOICE
SHORT_ANSWER
```

Scope:

```txt
LECTURE
CHAPTER
CUSTOM_CONTENT
```

Quy tắc:

- Câu hỏi phải có thể kiểm chứng từ học liệu.
- Câu hỏi lựa chọn phải có ít nhất một đáp án đúng.
- `SINGLE_CHOICE` có đúng một đáp án đúng.
- `MULTIPLE_CHOICE` có từ hai đáp án đúng trở lên.
- `SHORT_ANSWER` có đáp án mẫu và explanation.
- Trả source metadata nếu xác định được.
- Backend lưu `DRAFT`, Teacher review trước khi publish.

## 17. Test tối thiểu

### Parser

- PDF hợp lệ nhiều trang.
- TXT hợp lệ.
- File không tồn tại.
- File rỗng.
- PDF scan không text.
- File sai type.
- File vượt 20MB.

### Cleaner/Chunker

- Whitespace nhiễu.
- Nội dung ngắn.
- Nội dung tạo nhiều chunks.
- Overlap đúng.
- `chunk_index` đúng.
- Metadata trang không mất.

### Embedding/Persistence

- Vector đúng dimensions.
- Batch count đúng.
- Retry lỗi tạm thời.
- Rollback giữ chunks cũ.
- Reprocess thay chunks thành công.

### Integration

- Backend upload -> shared storage.
- Backend gọi AI với `storage_key`.
- AI xử lý -> Backend cập nhật `PROCESSED`.
- Lỗi parse -> Backend cập nhật `FAILED`.

