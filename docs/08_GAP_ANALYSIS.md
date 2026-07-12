# Gap Analysis - LMS-RAG Scope & Auth Grill

**Phiên bản:** 1.0
**Cập nhật:** 11/07/2026
**Nguồn:** Grill session Step 1-7, đối chiếu toàn bộ docs

---

## A. Gaps từ Docs (thiếu trong file docs chính thức)

| # | Gap | Nguồn | Mức độ |
|---|---|---|---|
| A1 | JWT: không có expiry, refresh token flow, algorithm | Step 2 | High |
| A2 | Logout endpoint/flow chưa có trong API contract | Step 2 | Medium |
| A3 | Deactivate user -> chặn ngay + invalidate token, chưa ghi trong docs | Step 2 | High |
| A4 | Upload atomic rollback (DB + file) chưa mô tả | Step 3 | Medium |
| A5 | Thông báo EMPTY_DOCUMENT cho Teacher + UX retry upload chưa có trong docs | Step 3 | Low |
| A6 | Transaction gap: DELETE chunks cũ trước khi INSERT mới, RAG query đồng thời thấy 0 chunks | Step 4 | High |
| A7 | `q` search keyword trong Library - field nào được search? (Đã chốt: all text metadata) | Step 6 | Medium |
| A8 | Library list response thiếu wrapper pagination (total, total_pages) | Step 6 | Medium |
| A9 | Multi-turn RAG context: không có conversation_id hay messages[] array | Step 7 | High |
| A10 | Similarity threshold chưa có giá trị cụ thể (để configurable) | Step 7 | Medium |
| A11 | File download/serve endpoint không có trong Backend API contract | Step 1 | Medium |
| A12 | Password seed demo: chỉ có placeholder BCrypt hash | Step 1 | Low |
| A13 | Lỗi đánh máy: index ghi 05_DATABASE_SCHEMA.md, file thật là 05_DATABASE_SCHEMA_CONTRACT.md | Step 1 | Low |

---

## B. Gaps chức năng (tính năng thiếu cho MVP)

| # | Gap | Nguồn | Mức độ |
|---|---|---|---|
| B1 | Teacher không withdraw được submission ở PENDING_REVIEW | Step 5 | Low |
| B2 | Admin không undo approve (approve nhầm -> chỉ archive) | Step 5 | Low |
| B3 | Admin review queue không có filter (subject, uploader) | Step 5 | Low |
| B4 | Không có lịch sử review/reject (chỉ lưu rejection_reason mới nhất) | Step 5 | Low |
| B5 | Không có forgot/reset password cho bất kỳ ai | Step 2 | Low |
| B6 | Không có rate limiting | Step 1 | Low |
| B7 | Không có CORS config | Step 1 | Low |
| B8 | Internal key: không có cơ chế rotate/hot-reload | Step 2 | Low |
| B9 | Notification Admin khi phát hiện document lỗi lúc RAG (Q7 Step 1) | Step 1 | Low |

---

## C. Gaps docs internal AI (AI team tự quyết, nhưng chưa ghi)

| # | Gap | Mức độ |
|---|---|---|
| C1 | OpenAI retry count, backoff strategy | Medium |
| C2 | HTTP timeout value cho process-document | Medium |
| C3 | Cache embeddings khi INSERT fail để retry không gọi OpenAI lại | Low |
| C4 | Excerpt length/cách chọn từ chunk | Low |

---

## D. Priority để sửa docs trước khi code

### Phải sửa ngay (High)

| # | Cần làm |
|---|---|
| 1 | Thêm JWT detail (expiry, refresh token) vào contract/auth docs |
| 2 | Thêm logout endpoint vào API contract |
| 3 | Thêm flow deactivate invalidate token vào docs |
| 4 | Giải quyết transaction gap RAG vs reprocess (cách ly đọc/ghi) |
| 5 | Chốt multi-turn RAG: stateless (FE gửi history) hay stateful (conversation_id) |

### Nên sửa (Medium)

| # | Cần làm |
|---|---|
| 6 | Thêm pagination wrapper cho Library response |
| 7 | Định nghĩa `q` search fields trong Library API |
| 8 | Viết rõ upload atomic flow |
| 9 | Thêm file download endpoint vào API contract |
| 10 | Viết rõ similarity threshold config |

### Có thể để sau (Low)

B3-B9, A5, A12-A13.

---

## E. Quyết định đã chốt trong quá trình grill (trước đây chưa có trong docs)

| # | Quyết định | File cần cập nhật |
|---|---|---|
| 1 | Teacher sau PUBLISHED chỉ Xem/RAG. Muốn sửa -> archive | 01_PROJECT_PRD.md |
| 2 | Archive = ẩn đi, giữ lại xem lịch sử. Teacher khác không thấy | 01_PROJECT_PRD.md |
| 3 | Chặn upload khi processing_status = PROCESSING | 03_BE_AI_INTEGRATION.md |
| 4 | Submit lại sau reject: sửa metadata -> submit luôn; thay file -> process lại rồi mới submit | 01_PROJECT_PRD.md |
| 5 | Multi-doc RAG có document chưa PROCESSED: RAG doc hợp lệ + notify Admin | 03_BE_AI_INTEGRATION.md |
| 6 | Access token ngắn hạn + refresh token dài hạn lưu DB | 02_MVP_IMPLEMENTATION_PLAN.md |
| 7 | Logout -> xóa refresh token DB + xóa client | 02_MVP_IMPLEMENTATION_PLAN.md |
| 8 | Teacher khác được tải file gốc từ Library | 01_PROJECT_PRD.md |
| 9 | Rejection_reason là free-text, không phải chọn từ danh sách mẫu | (docs đúng, không cần sửa) |
| 10 | Không bỏ chunk nhỏ, giữ hết (overlap 150 bảo vệ context) | 06_AI_PIPELINE.md |
| 11 | INSERT lỗi -> retry DELETE+INSERT, không gọi OpenAI lại | 06_AI_PIPELINE.md |
| 12 | Multi-turn RAG: AI có context từ câu hỏi trước | 04_AI_API_CONTRACT.md |
| 13 | Answer theo language, citation giữ nguyên ngôn ngữ gốc của chunk | 06_AI_PIPELINE.md |
| 14 | not_found: không gọi generation model, answer hardcoded, tokens_used=0 | 06_AI_PIPELINE.md |
| 15 | Library q search across title, description, subject, topic, chapter, tags | 02_MVP_IMPLEMENTATION_PLAN.md |
