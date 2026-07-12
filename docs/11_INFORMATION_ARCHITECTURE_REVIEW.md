# Information Architecture Review - LMS-RAG

**Phiên bản:** 1.0
**Cập nhật:** 11/07/2026
**Nguồn:** Grill Step 11, đối chiếu với 01_PROJECT_PRD.md Section 9 và 02_MVP_IMPLEMENTATION_PLAN.md

---

## 1. Navigation Structure (GAP - chưa có trong docs)

Docs chỉ liệt kê routes, chưa định nghĩa navigation structure. Cần bổ sung theo chuẩn web:

### Sidebar (phân quyền theo role)

**Teacher:**
- Library (`/library`)
- My Documents (`/my-documents`)

**Admin:**
- Library (`/library`) - xem
- Reviews (`/admin/reviews`)
- Teachers (`/admin/teachers`) - Should-have

### Topbar (chung cho cả 2 role)
- User info (name, role)
- Logout button

### Breadcrumb
- Theo route hierarchy, ví dụ: Library > Chi tiết tài liệu

---

## 2. Route / Component Mapping

| Route | Component | Ghi chú |
|---|---|---|
| `/login` | LoginPage | |
| `/library` | LibraryListPage | Filter/search, pagination |
| `/library/:documentId` | DocumentDetailPage (shared) | Metadata + Download + RAG. `isOwner=false` |
| `/my-documents` | MyDocumentsPage | List + status filters |
| `/my-documents/upload` | UploadDocumentPage | Multipart form, metadata |
| `/my-documents/:documentId` | DocumentDetailPage (shared) | Metadata + RAG + Edit/Submit/Reprocess/Delete. `isOwner=true` |
| `/admin/reviews` | AdminReviewQueuePage | PENDING_REVIEW list |
| `/admin/reviews/:documentId` | AdminReviewDetailPage | Approve/Reject |
| `/admin/teachers` | AdminTeachersPage | Should-have |

### Quyết định: Shared DocumentDetailPage

`/library/:documentId` và `/my-documents/:documentId` dùng **chung một component**. Khác biệt:
- **Owner**: hiển thị thêm nút Edit Metadata, Submit Review, Reprocess, Delete (theo permission từng status)
- **Non-owner**: chỉ Download + RAG

Component nhận `document` data + `isOwner` flag.

---

## 3. Admin Navigation (đã chốt)

Admin **không** upload tài liệu. Admin không có workspace cá nhân.
- Không có route `/my-documents` cho Admin
- Không có nút Upload
- Navigation Admin: Library (xem) + Reviews + Teachers

---

## 4. Gaps phát hiện

| # | Gap | Mức độ | Action |
|---|---|---|---|
| IA1 | Thiếu navigation structure (sidebar, topbar, breadcrumb) trong docs FE | Medium | Bổ sung vào FE implementation plan |
| IA2 | Thiếu API `GET /api/v1/users/teachers` - trả list `{id, name}` Teacher có document PUBLISHED, để FE render dropdown filter `uploaded_by` trong Library | Medium | Thêm API vào Backend contract |
| IA3 | BE-05 `GET /api/v1/my/documents` thiếu query params `processing_status` và `publication_status` để FE filter trong My Documents list | Medium | Cập nhật API contract |
| IA4 | Tags input: free-text, comma-separated. Không có autocomplete. Đã khớp docs | None | Đúng, không cần sửa |

---

## 5. Tổng kết

| Loại | Số lượng |
|---|---|
| Quyết định IA đã chốt | 6 |
| Shared component | 1 (DocumentDetailPage) |
| Gaps mới | 3 (IA1, IA2, IA3) |
| Đúng docs | 1 (IA4) |
