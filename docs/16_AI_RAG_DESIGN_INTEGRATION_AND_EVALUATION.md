# 2.x. PHÂN TÍCH VÀ THIẾT KẾ MÔ-ĐUN HỖ TRỢ AI/RAG

> **Hướng dẫn sử dụng:** Thay số 2.x bằng số mục thực tế khi đưa nội dung này vào Chương 2 của báo cáo.

## 2.x.1. Tổng quan

EduRAG là hệ thống thư viện học liệu có tích hợp trí tuệ nhân tạo nhằm hỗ trợ giảng viên khai thác nội dung tài liệu và tạo nội dung ôn tập. Sau khi được Quản trị viên phê duyệt, tài liệu được công bố trong thư viện và được lập chỉ mục để sử dụng cho chức năng hỏi đáp RAG và sinh quiz.

Mô-đun AI sử dụng kiến trúc Retrieval-Augmented Generation, viết tắt là RAG. Hệ thống tìm các đoạn liên quan trong tài liệu trước, sau đó cung cấp chúng cho mô hình ngôn ngữ để tạo câu trả lời. Cách tiếp cận này giúp giới hạn câu trả lời trong tài liệu và cung cấp nguồn để kiểm chứng.

EduRAG không tự huấn luyện hoặc fine-tuning mô hình mới. Hệ thống sử dụng mô hình embedding và mô hình ngôn ngữ đã được huấn luyện sẵn. Phần nhóm thiết kế gồm xử lý tài liệu, lập chỉ mục, retrieval, xây dựng context, citation, sinh quiz và tích hợp AI Service với Backend.

Không phải mọi bước trong pipeline đều trực tiếp sử dụng AI:

| Thành phần | Phân loại |
|---|---|
| Parse, clean và chunk | Tiền xử lý dữ liệu |
| Sinh embedding | Sử dụng mô hình AI |
| Vector và keyword search | Truy xuất dữ liệu |
| Sinh câu trả lời và quiz | Sử dụng mô hình ngôn ngữ |
| Ánh xạ citation | Logic kiểm chứng |

Các bước trên được trình bày chung vì chúng tạo thành pipeline RAG hoàn chỉnh.

## 2.x.2. Mục tiêu và phạm vi

### 2.x.2.1. Mục tiêu

1. Xác định tài liệu có thể khai thác bằng RAG hay không.
2. Lập chỉ mục nội dung sau khi tài liệu được phê duyệt.
3. Cho phép giảng viên đặt câu hỏi bằng ngôn ngữ tự nhiên.
4. Tìm nội dung liên quan trong đúng tài liệu được phép sử dụng.
5. Sinh câu trả lời dựa trên context đã truy xuất.
6. Cung cấp citation để kiểm tra nguồn.
7. Trả not-found khi tài liệu không đủ thông tin.
8. Hỗ trợ câu hỏi tiếp nối và truy vấn theo chương.
9. Tạo quiz nháp có đáp án, giải thích và citation.
10. Đảm bảo giảng viên kiểm duyệt nội dung AI trước khi công bố.

### 2.x.2.2. Phạm vi

Mô-đun hỗ trợ PDF, TXT, DOCX; parse, clean, chunk; embedding và pgvector; hybrid retrieval; hỏi đáp có citation; history gần nhất và sinh quiz một đáp án đúng.

Mô-đun chưa hỗ trợ tự huấn luyện, fine-tuning, OCR, hỏi đáp Internet, AI tự công bố nội dung, tài khoản người học và lưu điểm quiz.

## 2.x.3. Xác định bài toán

### 2.x.3.1. Phân tích tài liệu

Sau khi upload, hệ thống kiểm tra tài liệu có text phù hợp để thực hiện RAG hay không.

| Thành phần | Nội dung |
|---|---|
| Đầu vào | ID tài liệu, storage key, loại tệp và metadata |
| Đầu ra | Khả năng RAG, số trang, token, chunk ước lượng và lý do không hỗ trợ |

Bước analyze chỉ parse và chunk để ước lượng; chưa gọi embedding và chưa ghi document_chunks. Thiết kế này tránh tốn phí embedding cho tài liệu chưa được phê duyệt.

### 2.x.3.2. Lập chỉ mục tài liệu

Khi tài liệu được phê duyệt, hệ thống chuyển nội dung thành kho tri thức có thể truy vấn.

~~~text
Tài liệu
→ Kiểm tra tệp
→ Parse nội dung
→ Làm sạch văn bản
→ Chia chunk
→ Sinh embedding
→ Lưu PostgreSQL/pgvector
~~~

Đầu ra gồm các chunk, vector embedding, metadata nguồn và trạng thái PROCESSED.

### 2.x.3.3. Hỏi đáp dựa trên tài liệu

Cho tập tài liệu D đã được kiểm quyền, câu hỏi q, lịch sử H và ngôn ngữ L, hệ thống cần tìm context C và sinh câu trả lời a:

~~~text
C = Retrieve(q, H, D)
a = Generate(q, H, C)
citations = MapToRealChunks(C)
~~~

Câu trả lời phải dựa trên C; citation phải truy ngược được tới chunk thật. Nếu không có context phù hợp, hệ thống trả not-found.

### 2.x.3.4. Sinh quiz

Từ tài liệu đã index, số lượng câu hỏi và ngôn ngữ, hệ thống sinh quiz có cấu trúc. Mỗi câu gồm nội dung, hai đến bốn phương án, một đáp án đúng, giải thích và citation. Quiz được lưu DRAFT để giảng viên review trước khi công bố.

## 2.x.4. Yêu cầu chức năng

| Mã | Yêu cầu |
|---|---|
| AI-FR-01 | Phân tích khả năng RAG của tài liệu |
| AI-FR-02 | Parse, làm sạch và chia chunk |
| AI-FR-03 | Duy trì document, trang và thứ tự chunk |
| AI-FR-04 | Sinh embedding và lưu pgvector |
| AI-FR-05 | Hỗ trợ re-index an toàn |
| AI-FR-06 | Tìm chunk liên quan trong phạm vi được phép |
| AI-FR-07 | Kết hợp vector và keyword retrieval |
| AI-FR-08 | Hỗ trợ truy vấn theo chương |
| AI-FR-09 | Hỗ trợ câu hỏi tiếp nối |
| AI-FR-10 | Sinh câu trả lời từ context |
| AI-FR-11 | Trả citation từ chunk thật |
| AI-FR-12 | Trả not-found khi không đủ thông tin |
| AI-FR-13 | Sinh và kiểm tra quiz có cấu trúc |
| AI-FR-14 | Gắn citation cho câu hỏi quiz |
| AI-FR-15 | Lưu quiz AI dưới dạng bản nháp |

## 2.x.5. Đầu vào và đầu ra

| Chức năng | Đầu vào | Đầu ra |
|---|---|---|
| Analyze | document_id, storage_key, file_type, metadata | can_rag, rag_status, page_count, estimated tokens/chunks |
| Index | document_id, storage_key, file_type, reprocess, metadata | status, page_count, chunk_count |
| Answer | document_ids, question, top_k, language, history | answer, not_found, citations, tokens_used |
| Generate quiz | document_ids, question_count, language, max_context_chunks | title, description, questions, tokens_used |

Ràng buộc chính:

- Answer nhận tối đa mười document IDs, top_k từ một đến tám và tối đa sáu history message.
- Citation gồm chunk_id, document_id, page_number, chunk_index, excerpt và score.
- Quiz có từ một đến mười câu; mỗi câu có hai đến bốn lựa chọn, một đáp án và tối đa ba citation.

## 2.x.6. Kiến trúc mô-đun

~~~mermaid
flowchart LR
    U[Người dùng] --> FE[Frontend React]
    FE --> BE[Backend Spring Boot]
    BE -->|REST và X-Internal-Key| AI[AI Service FastAPI]
    BE --> DB[(PostgreSQL)]
    AI --> DP[Document Processing]
    DP --> EMB[Embedding Provider]
    EMB --> OAI[OpenAI API]
    DP --> VDB[(pgvector)]
    AI --> RET[Retrieval]
    RET --> VDB
    AI --> GEN[Generation Provider]
    GEN --> OAI
    AI --> BE
    BE --> FE
~~~

| Thành phần | Trách nhiệm |
|---|---|
| Frontend | Giao diện hỏi đáp, citation và quiz |
| Backend | Xác thực, phân quyền, document, history và quiz |
| AI Service | Xử lý tài liệu, retrieval, generation và citation |
| Shared storage | Lưu tệp để Backend ghi và AI đọc |
| PostgreSQL/pgvector | Lưu dữ liệu nghiệp vụ, chunk và vector |
| OpenAI | Embedding và sinh nội dung |

Backend kiểm tra người dùng, quyền và trạng thái tài liệu. AI Service giới hạn mọi truy vấn trong document IDs do Backend gửi; không xác thực JWT và không tự công bố nội dung.

## 2.x.7. Thiết kế dữ liệu

### 2.x.7.1. Document chunk

| Thuộc tính | Ý nghĩa |
|---|---|
| id | ID chunk |
| document_id | Tài liệu chứa chunk |
| page_number | Trang nguồn |
| chunk_index | Thứ tự chunk |
| content | Nội dung văn bản |
| token_count | Số token |
| embedding | Vector 1536 chiều |
| created_at | Thời gian tạo |

Ràng buộc duy nhất giữa document_id và chunk_index giúp duy trì thứ tự xác định của chunk trong một tài liệu.

### 2.x.7.2. Hội thoại và quiz

Backend sử dụng rag_conversations và rag_messages để lưu hội thoại, câu hỏi, câu trả lời, citation và token. AI Service hoạt động stateless và chỉ nhận một số message gần nhất.

Quizzes lưu metadata, owner và trạng thái; quiz_questions lưu câu hỏi, options, đáp án, giải thích và citations. AI Service chỉ sinh quiz draft, không ghi trực tiếp vào bảng nghiệp vụ.

## 2.x.8. Pipeline xử lý tài liệu

### 2.x.8.1. Phân tích sơ bộ

~~~mermaid
flowchart TD
    A[Backend lưu file] --> B[Gọi analyze-document]
    B --> C[Resolve storage key]
    C --> D[Validate file]
    D --> E[Parse nội dung]
    E --> F[Làm sạch và chunk ước lượng]
    F --> G{Có text sử dụng được?}
    G -->|Có| H[READY_TO_PROCESS]
    G -->|Không| I[UNSUPPORTED]
    H --> J[Trả page, token và chunk]
    I --> J
~~~

Analyze không sinh embedding và không ghi document_chunks.

### 2.x.8.2. Lập chỉ mục

~~~mermaid
flowchart TD
    A[Tài liệu được phê duyệt] --> B[Gọi index-document]
    B --> C[Resolve và validate]
    C --> D[Parse]
    D --> E[Clean]
    E --> F[Chunk theo token]
    F --> G[Batch embedding]
    G --> H[Validate vectors]
    H --> I[Atomic replace chunks]
    I --> J[Trả PROCESSED]
~~~

Hệ thống kiểm tra storage key, loại tệp, phần mở rộng, chữ ký, kích thước và nội dung. Sau khi parse và chunk, embedding được tạo theo batch. Vector phải đúng số chiều và không chứa NaN hoặc Infinity.

Re-index sử dụng transaction: xóa chunk cũ và chèn chunk mới trong cùng transaction. Nếu insert thất bại, transaction rollback để dữ liệu cũ không bị mất.

## 2.x.9. Chunking và embedding

Cấu hình chunking mặc định:

| Tham số | Giá trị |
|---|---:|
| CHUNK_SIZE | 1000 token |
| CHUNK_OVERLAP | 150 token |

Overlap giữ một phần ngữ cảnh khi nội dung nằm ở ranh giới hai chunk.

Mỗi chunk c_i được chuyển thành vector:

~~~text
e_i = EmbeddingModel(c_i)
e_i thuộc không gian vector 1536 chiều
~~~

Hệ thống sử dụng text-embedding-3-small và lưu vector bằng VECTOR(1536). Khi có câu hỏi q, hệ thống tạo vector e_q rồi so sánh với các vector chunk trong phạm vi document IDs được phép.

## 2.x.10. Thiết kế retrieval

### 2.x.10.1. Vector search

pgvector sử dụng cosine distance. Hệ thống chuyển distance thành score:

~~~text
score = max(0, 1 - cosine_distance)
~~~

Score càng lớn thì chunk càng liên quan. Kết quả dưới RAG_SIMILARITY_THRESHOLD bị loại trước khi tạo context.

### 2.x.10.2. Keyword và hybrid retrieval

Keyword search bổ sung khả năng tìm exact phrase, tên riêng và khái niệm định nghĩa. Kết quả keyword và vector được gộp, loại trùng theo chunk_id và giới hạn số lượng context.

### 2.x.10.3. Truy xuất theo chương

Khi câu hỏi chứa số chương rõ ràng, hệ thống xác định phạm vi chương và lấy các chunk liên tục. Thiết kế này phù hợp hơn top-k rời rạc đối với câu hỏi tổng quan chương.

### 2.x.10.4. Câu hỏi tiếp nối

Đối với câu hỏi như “nói chi tiết hơn”, retrieval query được bổ sung bằng câu hỏi trước và một phần câu trả lời gần nhất. Câu hỏi độc lập không nối history để tránh làm sai chủ đề.

## 2.x.11. Luồng hỏi đáp RAG

~~~mermaid
sequenceDiagram
    actor GV as Giảng viên
    participant FE as Frontend
    participant BE as Backend
    participant AI as AI Service
    participant VDB as pgvector
    participant LLM as OpenAI

    GV->>FE: Nhập câu hỏi
    FE->>BE: Gửi câu hỏi kèm JWT
    BE->>BE: Kiểm quyền và trạng thái tài liệu
    BE->>AI: document_ids, question, history
    AI->>LLM: Tạo query embedding
    LLM-->>AI: Query vector
    AI->>VDB: Hybrid retrieval
    VDB-->>AI: Relevant chunks
    alt Không có context
        AI-->>BE: not_found và citations rỗng
    else Có context
        AI->>LLM: Question, history và context
        LLM-->>AI: Câu trả lời
        AI->>AI: Map citations từ chunk thật
        AI-->>BE: Answer, citations và tokens
    end
    BE->>BE: Lưu hội thoại
    BE-->>FE: Trả kết quả
~~~

Backend chỉ cho phép hỏi đáp khi tài liệu PUBLISHED và PROCESSED. AI Service thực hiện retrieval, sinh câu trả lời nếu có context và ánh xạ citation trước khi trả kết quả.

## 2.x.12. Citation và not-found

Citation gồm ID chunk, ID tài liệu, số trang, thứ tự chunk, excerpt và score. Metadata được lấy từ database, không do mô hình tự tạo.

Nếu không có context phù hợp:

~~~text
not_found = true
citations = []
tokens_used = 0
~~~

AI Service không gọi generation model khi context rỗng. Nếu model nhận định context chưa đủ, hệ thống cũng trả not-found và không hiển thị citation gây hiểu nhầm.

## 2.x.13. Thiết kế sinh quiz

~~~mermaid
sequenceDiagram
    actor GV as Giảng viên
    participant FE as Frontend
    participant BE as Backend
    participant AI as AI Service
    participant DB as PostgreSQL
    participant LLM as OpenAI

    GV->>FE: Yêu cầu sinh quiz
    FE->>BE: Document, số câu, ngôn ngữ
    BE->>BE: Kiểm tra Teacher và document
    BE->>AI: generate-quiz
    AI->>DB: Lấy chunks rải đều
    DB-->>AI: Context chunks
    AI->>LLM: Sinh quiz JSON
    LLM-->>AI: Quiz JSON
    AI->>AI: Parse, validate, map citations
    AI-->>BE: Quiz draft
    BE->>DB: Lưu DRAFT
    BE-->>FE: Mở màn hình review
~~~

Quiz không có truy vấn cụ thể để vector search. Repository chia tài liệu thành các vùng theo thứ tự chunk và lấy mẫu rải đều bằng NTILE.

AI Service kiểm tra số câu, nội dung, options, đúng một đáp án, explanation và citation. AI không tự publish; Backend lưu quiz DRAFT để giảng viên review.

## 2.x.14. Tích hợp Backend–AI Service

### 2.x.14.1. API nội bộ

| Phương thức | Endpoint | Mục đích |
|---|---|---|
| GET | /v1/health | Kiểm tra AI Service |
| GET | /v1/health/pgvector | Kiểm tra database và pgvector |
| POST | /v1/analyze-document | Phân tích khả năng RAG |
| POST | /v1/index-document | Lập chỉ mục tài liệu |
| POST | /v1/answer-question | Hỏi đáp RAG |
| POST | /v1/generate-quiz | Sinh quiz draft |

Endpoint process-document được giữ để tương thích với luồng index cũ.

### 2.x.14.2. Xác thực và shared storage

Frontend chỉ gọi Backend. Backend gọi AI Service bằng X-Internal-Key. OpenAI API key chỉ tồn tại trong môi trường server.

Backend ghi file vào shared storage; AI Service chỉ đọc file qua storage key:

~~~text
documents/{document_id}/{version}/source.{extension}
~~~

AI Service xác minh đường dẫn sau khi resolve vẫn nằm dưới UPLOAD_ROOT.

## 2.x.15. Lựa chọn mô hình và cấu hình

| Mục đích | Mô hình |
|---|---|
| Sinh embedding | text-embedding-3-small |
| Sinh câu trả lời và quiz | gpt-4o-mini |

Cấu hình chính:

| Cấu hình | Giá trị mặc định |
|---|---:|
| EMBEDDING_DIMENSIONS | 1536 |
| CHUNK_SIZE | 1000 |
| CHUNK_OVERLAP | 150 |
| DEFAULT_TOP_K | 5 |
| RAG_SIMILARITY_THRESHOLD | 0.3 |
| EMBEDDING_BATCH_SIZE | 64 |
| GENERATION_DEFAULT_MAX_TOKENS | 700 |
| GENERATION_SUMMARY_MAX_TOKENS | 1200 |
| GENERATION_QUIZ_MAX_TOKENS | 1800 |
| QUIZ_CONTEXT_CHUNKS | 12 |
| Generation temperature | 0.2 |

Các giá trị được quản lý bằng biến môi trường để thay đổi mà không sửa logic nghiệp vụ.

## 2.x.16. Yêu cầu phi chức năng

### 2.x.16.1. Bảo mật

- Chỉ Backend được gọi API AI nội bộ.
- Không để lộ OpenAI API key.
- Không log JWT hoặc secret.
- Retrieval chỉ chạy trong document IDs hợp lệ.
- Storage key phải an toàn.
- AI không tự xác định quyền người dùng.

### 2.x.16.2. Độ tin cậy

- Validate request và response.
- Có timeout và retry giới hạn.
- Không gọi LLM khi context rỗng.
- Re-index sử dụng transaction.
- Kiểm tra vector đúng số chiều.
- Kiểm tra JSON quiz trước khi lưu.

### 2.x.16.3. Khả năng kiểm chứng

- Citation truy ngược được về chunk thật.
- Quiz có nguồn theo từng câu.
- Giảng viên review nội dung AI.
- Hệ thống thông báo rõ khi không đủ thông tin.

### 2.x.16.4. Hiệu năng và chi phí

Chi phí phát sinh khi embedding tài liệu, embedding câu hỏi và generation. Hệ thống kiểm soát bằng cách:

- Chỉ embedding sau khi Admin phê duyệt.
- Không gọi generation khi không có context.
- Giới hạn số chunk và history.
- Giới hạn token đầu ra.
- Batch embedding.
- Lưu token sử dụng của câu trả lời và quiz.

## 2.x.17. Hạn chế

1. Chất lượng retrieval phụ thuộc vào text trích xuất.
2. Chưa hỗ trợ OCR cho tài liệu scan.
3. Retrieval có thể bỏ sót nội dung liên quan.
4. Tóm tắt toàn tài liệu có thể không bao phủ đều mọi chương.
5. Citation chưa gắn trực tiếp với từng mệnh đề.
6. Kết quả generation và quiz có thể thay đổi giữa các lần gọi.
7. Câu hỏi theo chương có thể tạo context lớn và tăng chi phí.
8. Chưa có benchmark gán nhãn chính thức.
9. Chưa có báo cáo chi phí theo người dùng hoặc tài liệu.

## 2.x.18. Kết luận

Mô-đun hỗ trợ AI/RAG của EduRAG giải quyết hai chức năng chính: hỏi đáp có căn cứ trên tài liệu và sinh quiz nháp phục vụ giảng dạy. Hệ thống không tự huấn luyện mô hình mà tích hợp các mô hình được huấn luyện sẵn vào pipeline gồm xử lý tài liệu, embedding, retrieval, generation và citation.

Backend chịu trách nhiệm xác thực, phân quyền và quản lý dữ liệu nghiệp vụ; AI Service chịu trách nhiệm xử lý tài liệu và các tác vụ AI. Cơ chế giới hạn retrieval theo document, trả not-found và tạo citation từ chunk thật giúp giảm nguy cơ sử dụng thông tin ngoài tài liệu.

Mục này trình bày phần phân tích và thiết kế. Kết quả kiểm thử và đánh giá chất lượng được trình bày tại chương kiểm thử của báo cáo.

---

## Tài liệu nội bộ tham chiếu

- [AI pipeline](./06_AI_PIPELINE.md)
- [Backend–AI integration](./03_BE_AI_INTEGRATION.md)
- [AI API contract](./04_AI_API_CONTRACT.md)
- [System design](./08_SYSTEM_DESIGN.md)
- [AI learning log](./AI_LEARNING_LOG.md)
- [AI Service README](../ai-service/README.md)
