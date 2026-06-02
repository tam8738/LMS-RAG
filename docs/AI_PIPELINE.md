# AI Pipeline - LMS RAG Lecture Assistant

## 1. Mục tiêu

Tài liệu này mô tả phần việc AI Service trong MVP của hệ thống LMS RAG Lecture Assistant. Mục tiêu là giúp Backend và AI thống nhất rõ:

- AI Service nhận dữ liệu gì từ Backend.
- AI Service xử lý tài liệu như thế nào.
- Dữ liệu nào cần lưu để phục vụ RAG.
- Câu trả lời, summary và quiz phải có chất lượng, cấu trúc và giới hạn ra sao.
- Những phần nào nằm ngoài phạm vi MVP.

AI Service không xử lý xác thực, phân quyền người dùng hoặc nghiệp vụ course. Backend phải kiểm tra quyền truy cập trước khi gọi AI Service.

## 2. Phạm vi AI trong MVP

AI Service cần hoàn thành các chức năng sau:

- Xử lý tài liệu PDF/TXT có thể trích xuất văn bản.
- Làm sạch nội dung tài liệu.
- Chia tài liệu thành các đoạn nhỏ.
- Gắn metadata cho từng đoạn.
- Sinh embedding cho các đoạn nội dung.
- Lưu chunks và embedding vào PostgreSQL/pgvector.
- Truy xuất top-k chunks theo lecture.
- Trả lời câu hỏi bằng RAG dựa trên các chunks truy xuất được.
- Trả về citations để Student kiểm chứng nguồn.
- Sinh summary bài giảng.
- Sinh quiz ôn tập dạng JSON có cấu trúc.

Ngoài phạm vi MVP:

- OCR cho file scan.
- Xử lý PPTX/DOCX nâng cao.
- Hỏi đáp trên nhiều lecture hoặc toàn bộ course cùng lúc.
- Chấm tự động câu hỏi tự luận bằng LLM.
- Tự động publish summary/quiz.
- Adaptive learning hoặc phân tích điểm yếu học tập nâng cao.

## 3. Luồng xử lý tài liệu

Luồng tổng quát:

```txt
Teacher upload file
        |
        v
Backend lưu document record và file local
        |
        v
Backend gọi AI Service /process-document
        |
        v
AI Service parse PDF/TXT
        |
        v
Clean text và tách theo page nếu có
        |
        v
Chunk text + metadata
        |
        v
Generate embeddings
        |
        v
Lưu document_chunks vào PostgreSQL/pgvector
        |
        v
Trả kết quả processed/failed cho Backend
```

## 4. Pipeline chi tiết

### 4.1. Parse tài liệu

Input từ Backend:

- `document_id`
- `lecture_id`
- `file_path`
- `file_type`

Yêu cầu:

- Hỗ trợ `.pdf` và `.txt`.
- PDF cần lấy được text theo page nếu thư viện parser hỗ trợ.
- TXT cần đọc bằng UTF-8, có fallback xử lý lỗi encoding nếu cần.
- File rỗng hoặc không trích xuất được text phải trả về trạng thái `failed` rõ ràng.

Trạng thái lỗi cần xử lý:

- File không tồn tại.
- File sai định dạng.
- File rỗng.
- PDF bị lỗi parser.
- PDF scan không có text.

### 4.2. Clean text

Mục tiêu clean:

- Normalize whitespace.
- Xóa dòng trống hoặc nội dung lặp lại quá nhiều nếu gây nhiễu.
- Giữ nội dung code, công thức, keyword kỹ thuật nếu có.
- Không tự ý dịch, tóm tắt hoặc viết lại nội dung tài liệu ở bước clean.
- Giữ `page_number` nếu parse được theo page.

### 4.3. Chunking

Đề xuất MVP:

- Chunk theo số token/ký tự, ưu tiên cắt tại ranh giới paragraph.
- Kích thước tham khảo: 800-1200 tokens mỗi chunk.
- Overlap tham khảo: 100-200 tokens.
- Mỗi chunk cần có `chunk_index` tăng dần trong một document.

Metadata tối thiểu:

- `document_id`
- `lecture_id`
- `page_number`
- `chunk_index`
- `content`

### 4.4. Embedding

Yêu cầu:

- Generate embedding cho từng chunk.
- Nếu gọi AI Provider lỗi tạm thời, có retry giới hạn.
- Không gọi embedding lại nếu document đã `processed` và chunks đã tồn tại, trừ khi Backend yêu cầu reprocess.
- Lưu embedding vào cột vector của pgvector.

### 4.5. Lưu vector

Bảng đề xuất: `document_chunks`.

Cột tối thiểu:

| Cột | Kiểu dữ liệu đề xuất | Ghi chú |
|---|---|---|
| `id` | UUID hoặc BIGSERIAL | Khóa chính |
| `document_id` | UUID/BIGINT | Id document từ Backend |
| `lecture_id` | UUID/BIGINT | Dùng để filter retrieval |
| `page_number` | INTEGER nullable | Trang PDF nếu có |
| `chunk_index` | INTEGER | Thứ tự chunk trong document |
| `content` | TEXT | Nội dung chunk |
| `embedding` | VECTOR | Vector pgvector |
| `created_at` | TIMESTAMP | Thời điểm tạo |

Index đề xuất:

- Index theo `lecture_id`.
- Vector index theo `embedding` nếu đủ thời gian cấu hình.

## 5. Luồng RAG Q&A

Luồng tổng quát:

```txt
Student hỏi câu hỏi
        |
        v
Backend kiểm tra Student đã join course và lecture hợp lệ
        |
        v
Backend gọi AI Service /answer-question
        |
        v
AI Service embedding câu hỏi
        |
        v
Retrieve top-k chunks theo lecture_id
        |
        v
Generate answer dựa trên retrieved context
        |
        v
Trả answer + citations
        |
        v
Backend lưu chat history
```

Yêu cầu bắt buộc:

- Retrieval phải filter theo `lecture_id`.
- Câu trả lời chỉ dựa trên context truy xuất được.
- Nếu context không đủ, trả về thông báo không tìm thấy thông tin trong bài giảng.
- Mỗi câu trả lời nên có citations.
- Citation cần trả về được `document_id`, `page_number`, `chunk_index` và một đoạn nguồn ngắn.

Top-k đề xuất MVP:

- Mặc định `top_k = 5`.
- Có thể cho Backend truyền `top_k`, nhưng AI Service nên giới hạn trong khoảng hợp lý, ví dụ 3-8.

## 6. Prompt guideline

### 6.1. RAG answer

Nguyên tắc:

- Trả lời bằng tiếng Việt nếu người dùng hỏi tiếng Việt.
- Không dùng kiến thức ngoài tài liệu nếu context không có.
- Nếu tài liệu không có thông tin, nói rõ: "Không tìm thấy thông tin này trong bài giảng đã cung cấp."
- Ưu tiên câu trả lời ngắn gọn, rõ ý, có giải thích khi cần.
- Không nói rằng đã đọc toàn bộ tài liệu nếu chỉ có retrieved chunks.

### 6.2. Summary

Summary phải:

- Bám sát nội dung lecture.
- Không tự thêm kiến thức ngoài.
- Có cấu trúc để Student ôn tập.
- Ở trạng thái draft để Teacher/Admin duyệt trước khi publish.

Đề xuất format:

```txt
1. Tóm tắt tổng quan
2. Các ý chính
3. Thuật ngữ/khái niệm quan trọng
4. Gợi ý ôn tập
```

### 6.3. Quiz

Quiz phải:

- Dựa trên nội dung lecture.
- Có cấu trúc JSON để Backend lưu vào database.
- Gồm MCQ và có thể có short answer.
- Mỗi câu hỏi có đáp án đúng hoặc đáp án mẫu.
- Mỗi câu hỏi có giải thích.

MVP chỉ chấm tự động MCQ. Short answer chỉ hiển thị đáp án mẫu và giải thích.

## 7. Chất lượng và đánh giá

Cần chuẩn bị bộ test nhỏ:

- 1-2 file PDF/TXT mẫu.
- 5-10 câu hỏi có đáp án nằm trong tài liệu.
- 3-5 câu hỏi ngoài tài liệu để test not-found.
- 1 yêu cầu sinh summary.
- 1 yêu cầu sinh quiz.

Tiêu chí đạt:

- Parse được text từ file mẫu.
- Chunks có metadata đúng.
- Retrieval trả về chunks liên quan.
- Câu trả lời RAG có citation.
- Câu hỏi ngoài tài liệu không bị AI bịa.
- Summary không thêm nội dung ngoài.
- Quiz JSON parse được và lưu được vào Backend.

## 8. Rủi ro và hướng xử lý

| Rủi ro | Hướng xử lý MVP |
|---|---|
| PDF scan không có text | Báo failed với lý do không trích xuất được text |
| PDF parser lỗi | Catch exception, trả failed, lưu `error_message` |
| Retrieval sai context | Filter theo `lecture_id`, tune chunk size/top_k |
| AI hallucination | Prompt cấm suy diễn, yêu cầu not-found khi thiếu context |
| Quiz JSON sai format | Yêu cầu model trả JSON, validate output trước khi trả Backend |
| OpenAI API lỗi | Retry giới hạn, trả error rõ ràng |
| Chi phí AI cao | Chỉ gọi khi Teacher/Admin bấm process/generate, lưu kết quả |

## 9. Checklist giai đoạn 02/06 - 04/06/2026

Cần hoàn thành trong giai đoạn hiện tại:

- [x] Mô tả phạm vi AI trong MVP.
- [x] Mô tả pipeline parse, clean, chunk, embedding, retrieval.
- [x] Đề xuất vector schema.
- [x] Đề xuất luồng RAG Q&A.
- [x] Đề xuất guideline cho summary và quiz.
- [x] Ghi rõ giới hạn ngoài MVP.
- [ ] Chốt contract API với Backend.
- [ ] Chốt kiểu `document_id`, `lecture_id` là UUID hay BIGINT theo database Backend.
- [ ] Chốt model embedding/generation và biến môi trường cần dùng.

