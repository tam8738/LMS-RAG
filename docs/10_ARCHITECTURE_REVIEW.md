# Architecture Review - LMS-RAG

**Phiên bản:** 1.0
**Cập nhật:** 11/07/2026
**Nguồn:** Grill Step 10, đối chiếu với 03_BE_AI_INTEGRATION.md

---

## 1. Các quyết định kiến trúc đã chốt (đúng, không cần sửa)

| # | Quyết định | Docs ref | Ghi chú |
|---|---|---|---|
| 1 | Backend là owner duy nhất của DB migration. AI team gửi yêu cầu thay đổi schema -> Backend tạo migration | 03_BE_AI_INTEGRATION.md Section 11 | Agreement có chủ đích |
| 2 | No message queue: Spring @Async in-process worker. Crash sau upload → document kẹt UPLOADED | 03_BE_AI_INTEGRATION.md Section 7 | Trade-off có chủ đích. MVP chấp nhận |
| 3 | AI stateless HTTP: AI restart không resume job dang dở. Teacher retry thủ công | 03_BE_AI_INTEGRATION.md Section 7, 04_AI_API_CONTRACT.md Section 9 | Trade-off có chủ đích |
| 4 | Shared storage: Docker named volume `uploads`. BE read-write, AI read-only | 03_BE_AI_INTEGRATION.md Section 4 | Đã chốt |
| 5 | Backend internal key `X-Internal-Key` để gọi AI. AI không xử lý JWT | 03_BE_AI_INTEGRATION.md Section 9 | Đã chốt |
| 6 | FE dev local trước, không cần Docker. Docker compose: postgres + backend + ai-service. FE join Docker sau | 02_MVP_IMPLEMENTATION_PLAN.md Section 10 | Đã chốt ở grill Step 10 |

---

## 2. Gaps kiến trúc

| # | Gap | Mức độ | Nguồn |
|---|---|---|---|
| A1 | Non-Docker dev local setup: BE và AI chạy 2 process riêng, cần share UPLOAD_ROOT absolute path. Docs không có hướng dẫn | Low | Step 10 Q2 |
| A2 | File download/serve endpoint chưa có trong Backend API contract. FE-04 ghi "nếu Backend có endpoint file" | Medium | Step 10 Q5, cũng là A11 trong 08_GAP_ANALYSIS.md |
| A3 | Không có health check từ Backend -> AI trước khi gọi (chỉ catch error). Có endpoint `/v1/health` nhưng không dùng proactive check | Low | Step 10 Q4 |
| A4 | Internal key rotate/hot-reload không có cơ chế. Phải restart service | Low | Step 2 Q4, cũng là B8 trong 08_GAP_ANALYSIS.md |

---

## 3. Tổng kết

| Loại | Số lượng |
|---|---|
| Quyết định đã chốt, đúng | 6 |
| Gaps kiến trúc | 4 (1 Medium, 3 Low) |
