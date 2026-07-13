# Cải thiện chất lượng câu trả lời RAG

**Phiên bản:** 1.0  
**Cập nhật:** 14/07/2026  
**Owner:** Backend + AI Service  
**Trạng thái:** Đề xuất cải tiến sau MVP core

---

## 1. Tóm tắt

API `POST /api/v1/rag/answer` hiện tại đã hoạt động đúng luồng: nhận câu hỏi, kiểm tra quyền document, gọi AI Service retrieval, trả answer + citations. Tuy nhiên, câu trả lời hiện tại là **extractive answer** (ghép trực tiếp các chunks) nên dài, lộn xộn, thiếu tập trung vào ý chính của câu hỏi.

Tài liệu này phân tích vấn đề và đề xuất các hướng cải tiến để trả về câu trả lời cuối cùng (final answer) thay vì đống text khó đọc.

---

## 2. Vấn đề hiện tại

### 2.1. Extractive answer gây khó hiểu

AI Service hiện compose answer bằng cách ghép nội dung top chunks:

```python
context = "\n\n".join(chunk.content.strip() for chunk in chunks[:3])
return f"Based on the selected document, the relevant content is:\n\n{context}"
```

Hệ quả:

- Câu trả lời dài, chứa cả nội dung liên quan và không liên quan.
- Có code ví dụ, header, page number, key terms chen ngang.
- Không trả lời trực tiếp câu hỏi.
- Người dùng phải tự đọc và tóm tắt.

### 2.2. Ví dụ thực tế

**Câu hỏi:**

```json
{
  "documentIds": [19],
  "question": "What are the three pillars of object-oriented programming?",
  "topK": 3,
  "language": "en"
}
```

**Answer hiện tại:**

```txt
Based on the selected document, the relevant content is:

11.8 Dynamic Binding 447
11.7 Polymorphism
Polymorphism means that a variable of a supertype can refer to a subtype object.
The three pillars of object-oriented programming are encapsulation, inheritance, and polymor-
phism...
[thêm code ví dụ, key terms, chapter summary, objectives]
```

**Vấn đề:**

- Thông tin đúng có: *"The three pillars are encapsulation, inheritance, and polymorphism."*
- Nhưng bị chìm trong nhiều đoạn text thừa.
- Không có cấu trúc rõ ràng.

### 2.3. Nguyên nhân gốc rễ

| # | Nguyên nhân | Mô tả |
|---|---|---|
| 1 | Thiếu LLM generation | MVP chỉ dùng extractive answer, chưa gọi model sinh văn bản. |
| 2 | Ghép chunks thô | Lấy top-k chunks rồi nối bằng `\n\n`, không lọc/làm sạch. |
| 3 | Không tóm tắt | Không rút ra ý chính phù hợp với câu hỏi. |
| 4 | Ngôn ngữ answer cứng nhắc | Luôn bắt đầu bằng "Based on the selected document...". |
| 5 | Chưa xử lý citations trong answer | Citations tách rờ, answer không reference đến từng nguồn. |

---

## 3. Mục tiêu cải thiện

Câu trả lời cuối cùng cần:

1. **Trực tiếp trả lời câu hỏi** — không chỉ paste chunks.
2. **Ngắn gọn, có cấu trúc** — dạng bullet, paragraph súc tích.
3. **Dựa trên retrieved context** — không bịa kiến thức ngoài tài liệu.
4. **Kèm citations rõ ràng** — nếu có nhiều ý, mỗi ý reference đến chunk/page tương ứng.
5. **Hỗ trợ tiếng Việt và tiếng Anh** — answer theo `language` request.
6. **Nói rõ khi không đủ thông tin** — không cố trả lời khi context yếu.

**Ví dụ kết quả mong muốn:**

```json
{
  "success": true,
  "data": {
    "answer": "The three pillars of object-oriented programming are:\n\n1. Encapsulation\n2. Inheritance\n3. Polymorphism\n\nPolymorphism means a variable of a supertype can refer to a subtype object.",
    "notFound": false,
    "citations": [
      {
        "chunkId": 849,
        "documentId": 19,
        "pageNumber": 59,
        "chunkIndex": 58,
        "excerpt": "The three pillars of object-oriented programming are encapsulation, inheritance, and polymorphism.",
        "score": 0.538
      }
    ],
    "tokensUsed": 150
  }
}
```

---

## 4. Đề xuất cải tiến

### 4.1. Thêm LLM generation layer (Khuyến nghị cao nhất)

Sau khi retrieval xong, gọi OpenAI/LLM để tổng hợp câu trả lời.

**Luồng mới:**

```txt
question + history
→ embed
→ retrieval top-k chunks
→ build prompt (system + context + question)
→ LLM generate answer
→ parse answer + attach citations
→ return
```

**Prompt mẫu:**

```txt
You are a helpful teaching assistant. Answer the question using ONLY the provided document context.
If the context does not contain enough information, say "I cannot find the answer in the selected document."

Context:
{chunk_1}
{chunk_2}
{chunk_3}

Question: {question}

Answer concisely in {language}. Include citations like [1], [2] matching the context order.
```

**Lợi ích:**

- Câu trả lời tự nhiên, có cấu trúc.
- Tóm tắt được ý chính.
- Có thể trả lời theo ngôn ngữ yêu cầu.

**Rủi ro:**

- Tốn token, tốn chi phí.
- LLM có thể hallucinate nếu prompt không chặt.
- Cần thêm retry, timeout, error handling.

### 4.2. Làm sạch chunks trước khi ghép

Nếu không dùng LLM, ít nhất phải làm sạch chunks:

- Loại bỏ header/footer: "Chapter 10 Object-Oriented Thinking", "Key Terms", "Objectives".
- Loại bỏ code block không liên quan.
- Loại bỏ hình ảnh/diagram description.
- Giữ lại paragraph có nội dung chính.

**Ví dụ heuristic:**

```python
def is_meaningful_paragraph(text: str) -> bool:
    # Bỏ qua dòng ngắn chỉ có header
    if len(text.split()) < 10:
        return False
    # Bỏ qua code block
    if text.strip().startswith("public class") or "System.out.println" in text:
        return False
    return True
```

### 4.3. Giới hạn độ dài answer

- Giới hạn số chunks dùng để compose answer (`max_context_chunks = 3`).
- Giới hạn độ dài mỗi chunk (`max_chunk_length = 800 tokens`).
- Giới hạn tổng độ dài answer (`max_answer_length = 500 tokens`).

### 4.4. Cải thiện citation integration

Trong answer, thêm reference markers như `[1]`, `[2]` và map với citations:

```txt
The three pillars of OOP are encapsulation, inheritance, and polymorphism [1].
Polymorphism means a supertype variable can refer to a subtype object [1].
```

Citations array giữ nguyên `chunkId`, `pageNumber`, `excerpt`.

### 4.5. Tối ưu similarity threshold theo use-case

| Use-case | Threshold gợi ý | Lý do |
|---|---|---|
| Câu hỏi factual cụ thể | 0.5 - 0.6 | Cần độ chính xác cao. |
| Câu hỏi exploratory | 0.3 - 0.4 | Cho phép context rộng hơn. |
| Tài liệu ngắn/dễ | 0.4 - 0.5 | Chất lượng chunk tốt. |
| Tài liệu dài/khó | 0.2 - 0.3 | Tránh bỏ sót context liên quan. |

Có thể expose `threshold` trong request hoặc auto-tune theo số chunks/dộ dài câu hỏi.

### 4.6. Hỗ trợ multi-query expansion

Tách câu hỏi thành nhiều biến thể để retrieval tốt hơn:

```txt
"4 tính chất của OOP" → 
  ["four characteristics of object-oriented programming",
   "encapsulation inheritance polymorphism abstraction",
   "what is object-oriented programming"]
```

Gộp kết quả retrieval từ nhiều query, sau đó deduplicate và rerank.

### 4.7. Reranking

Sau retrieval, dùng một model nhỏ/cross-encoder để rerank chunks theo độ liên quan thực sự với câu hỏi. Giữ lại top 3-5 chunks chất lượng nhất.

---

## 5. Đề xuất triển khai theo giai đoạn

### Giai đoạn 1: Làm sạch chunks + giới hạn độ dài (nhanh, ít rủi ro)

- File: `ai-service/app/services/answer_question_service.py`
- Thêm `ChunkCleaner` đơn giản.
- Giới hạn `chunks[:3]` và độ dài mỗi chunk.
- Không cần gọi LLM.

**Kết quả mong đợi:** Answer ngắn hơn, ít nhiễu hơn.

### Giai đoạn 2: Thêm LLM generation (tốt nhất cho UX)

- File: `ai-service/app/services/answer_question_service.py`
- Thêm `GenerationProvider` interface.
- Triển khai `OpenAIGenerationProvider`.
- Cập nhật prompt template.
- Thêm `tokens_used` thật.

**Kết quả mong đợi:** Câu trả lời cuối cùng rõ ràng, tự nhiên.

### Giai đoạn 3: Multi-query + reranking (nâng cao)

- Thêm query expansion.
- Thêm cross-encoder reranker.
- Tối ưu latency/cost.

---

## 6. Thay đổi API contract

### Request (thêm optional)

```json
{
  "document_ids": [19],
  "question": "What are the three pillars of OOP?",
  "top_k": 5,
  "language": "en",
  "history": [],
  "generate": true,
  "max_answer_length": 300
}
```

| Field | Mô tả |
|---|---|
| `generate` | `true` = dùng LLM generation; `false` = extractive answer |
| `max_answer_length` | Giới hạn độ dài answer (tokens) |

### Response

```json
{
  "success": true,
  "data": {
    "answer": "The three pillars of OOP are encapsulation, inheritance, and polymorphism.",
    "not_found": false,
    "citations": [...],
    "tokens_used": 120
  }
}
```

---

## 7. Khuyến nghị ngay bây giờ

Trước khi triển khai LLM, có thể cải thiện nhanh bằng cách:

1. **Giảm `topK` mặc định từ 5 xuống 2-3** để answer ngắn hơn.
2. **Thêm `max_context_length`** để cắt bớt chunks dài.
3. **Làm sạch header/footer** trong chunks trước khi compose answer.
4. **Thay prefix cứng nhắc** "Based on the selected document..." bằng câu mở đầu ngắn gọn hơn.

---

## 8. Tài liệu liên quan

- `04_AI_API_CONTRACT.md`
- `06_AI_PIPELINE.md`
- `03_BE_AI_INTEGRATION.md`
