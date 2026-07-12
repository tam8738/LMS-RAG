# PRD Review - LMS-RAG Scope Grill

**Phiên bản:** 1.0
**Cập nhật:** 11/07/2026
**Nguồn:** Grill Step 9, đối chiếu với 01_PROJECT_PRD.md

---

## 1. Các điểm PRD cần sửa

| # | Vị trí PRD | Hiện tại | Cần sửa thành | Lý do |
|---|---|---|---|---|
| 1 | Section 5 Must-have | "RAG theo document_ids, có citation và not_found" | "RAG theo document_ids, **hỗ trợ hội thoại nhiều lượt**, có citation và not_found" | Grill Step 7 chốt multi-turn |
| 2 | Section 5 | "Search/filter theo metadata" ở Should-have | Chuyển lên **Must-have** | Library BE-07 đã có filter, PRD phải khớp implementation |
| 3 | Section 8 Permission table | Teacher khác ở PUBLISHED: "Xem/RAG" | Teacher khác ở PUBLISHED: "Xem/RAG/**Download**" | Grill Step 6 chốt Teacher khác được tải file gốc |

---

## 2. Các điểm PRD đúng, không cần sửa

| # | Vị trí | Nội dung | Ghi chú |
|---|---|---|---|
| 1 | Section 6 | Hai trạng thái độc lập (processing + publication) | Đúng. Không có constraint PUBLISHED bắt buộc PROCESSED |
| 2 | Section 8 | Teacher owner ở DRAFT: xem, sửa metadata/file, xóa, RAG nếu PROCESSED, submit | Đúng. Không chặn thao tác khi đang PROCESSING |
| 3 | Section 5 | Rejection_reason là TEXT | Đúng. Free-text, không phải chọn từ danh sách mẫu (đã verify ở Step 5) |
| 4 | Section 4.2 | 1 Admin duy nhất, tạo bằng seed | Đúng |
| 5 | Section 4.3 | Student out-of-scope | Đúng |

---

## 3. Gap mới phát hiện

| # | Gap | Nguồn | Mức độ |
|---|---|---|---|
| G1 | Teacher xóa document đang PROCESSING -> AI Service vẫn đang xử lý, cuối cùng INSERT chunks vào document_id không tồn tại -> lỗi DB. Docs không đề cập xử lý case này | Step 9 Q5 | Medium |

**Đề xuất xử lý (chưa chốt):**
- Option A: Chặn xóa khi processing_status = PROCESSING
- Option B: Cho phép xóa, AI Service handle gracefully (bắt lỗi FK, log warning)
- Option C: Giữ nguyên như docs hiện tại

---

## 4. Tổng kết PRD issues

| Loại | Số lượng |
|---|---|
| Cần sửa PRD | 3 |
| PRD đúng, không cần sửa | 5 |
| Gap mới | 1 |
