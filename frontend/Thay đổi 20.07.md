# Nhật Ký Thay Đổi Frontend & Cấu Trúc Routing URL

Tài liệu này ghi lại toàn bộ các công việc và chỉnh sửa cấu trúc Frontend đã được thực hiện.

---

## 1. Chuyển Đổi Điều Hướng Sang Route URL (React Router Migration)

Đã chuyển đổi toàn bộ cơ chế chuyển trang bằng state nội bộ (`currentScreen`, `setCurrentScreen`, `currentDocId`) sang URL chính thức với `react-router-dom`.

### 📁 Các file đã tạo / cập nhật:

- **[routes.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/routes.ts)** (Mới):
  - Định nghĩa tập trung các hằng số đường dẫn: `ROUTES.HOME` (`/`), `ROUTES.LOGIN` (`/login`), `ROUTES.LIBRARY` (`/library`), `ROUTES.LIBRARY_DETAIL` (`/library/:documentId`), `ROUTES.MY_DOCUMENTS` (`/my-documents`), `ROUTES.MY_DOCUMENT_DETAIL` (`/my-documents/:documentId`), `ROUTES.UPLOAD` (`/upload`), `ROUTES.ADMIN_REVIEWS` (`/admin/reviews`), `ROUTES.ADMIN_REVIEW_DETAIL` (`/admin/reviews/:documentId`).
  - Cung cấp các helper tạo URL động: `libraryDetailPath(id)`, `myDocumentDetailPath(id)`, `adminReviewDetailPath(id)`.

- **[navigation.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/navigation.ts)**:
  - Bổ sung trường `path` cho `NavItem`.
  - Thêm hàm kiểm tra phân quyền truy cập theo vai trò (`getDefaultRouteForRole`, `isRouteAllowedForRole`).

- **[App.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/App.tsx)**:
  - Bọc toàn bộ ứng dụng trong `BrowserRouter` và `Routes`.
  - Tích hợp `ProtectedRoute` tự động kiểm tra phiên đăng nhập và phân quyền (ngăn chặn tình trạng nháy trang khi tải phiên làm việc).
  - Thêm trang fallback 404 (`NotFoundPage`) cho các URL không hợp lệ (`*`).
  - Đăng ký lắng nghe sự kiện `auth-unauthorized` để điều hướng tự động về `/login`.

- **[AppLayout.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/components/AppLayout.tsx)**:
  - Sử dụng `useLocation()` và `useNavigate()`. Trạng thái active của menu điều hướng được tính toán trực tiếp từ `location.pathname`.

- **Các Trang Chi Tiết & Danh Sách**:
  - [LibraryDocumentDetailPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/LibraryDocumentDetailPage.tsx): Lấy `documentId` từ URL bằng `useParams<{ documentId: string }>()`.
  - [MyDocumentDetailPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/MyDocumentDetailPage.tsx): Lấy `documentId` từ URL bằng `useParams<{ documentId: string }>()`.
  - [AdminReviewDetailPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/AdminReviewDetailPage.tsx): Lấy `documentId` từ URL bằng `useParams<{ documentId: string }>()`.
  - [LibraryPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/LibraryPage.tsx), [MyDocumentsPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/MyDocumentsPage.tsx), [AdminReviewQueuePage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/AdminReviewQueuePage.tsx), [UploadDocumentPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/UploadDocumentPage.tsx): Tích hợp điều hướng `useNavigate()` khi tương tác với các thẻ tài liệu.

---

## 2. Tinh Chỉnh Giao Diện Giao Diện Thư Viện (Library Page UI Refinements)

Đã sửa chữa và tối ưu lại các khu vực bị lệch vị trí trong [LibraryPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/LibraryPage.tsx):

### 🛠 Chi tiết tinh chỉnh UI:

1. **Vị Trí Nút Điều Hướng Carousel (`<` và `>`)**:
   - *Vấn đề cũ:* Các nút `<` và `>` bị chen vào giữa khoảng trống giữa thẻ chính `SubjectLeadCard` và danh sách thẻ `DocumentCard`, làm đẩy lệch các card và làm hỏng hàng hiển thị.
   - *Đã sửa:* Di chuyển 2 nút điều hướng `<` và `>` lên góc bên phải của thanh **Header hàng** (`| Sẵn sàng hỏi đáp AI (5 tài liệu)`). Hàng các card tài liệu giờ đây được cuộn tràn liền mạch và gọn gàng.

2. **Nhãn Thẻ Chính AI Ready (`SubjectLeadCard`)**:
   - *Vấn đề cũ:* Thiếu chữ mô tả bên cạnh icon mũi tên ở góc dưới thẻ AI Ready.
   - *Đã sửa:* Đã bổ sung nhãn `"Khám phá ngay ->"` cho thẻ lead card AI Ready.

3. **Thứ Tự Phân Cấp Bộ Lọc Môn Học (`Subject Chips`)**:
   - *Vấn đề cũ:* Thanh tab chứa các pill button môn học (`[Tất cả môn học]`, `[Lập trình web]`,...) nằm lơ lửng phía trên dòng tiêu đề khu vực `Tất cả tài liệu` và nút `[Lọc nâng cao]`.
   - *Đã sửa:* Đặt thanh tab môn học xuống **ngay dưới tiêu đề `Tất cả tài liệu`**, tạo ra thứ tự thị giác logic: **Tiêu đề khu vực ➔ Thanh phân loại môn học ➔ Danh sách học liệu**.

---

## 3. Kết Quả Kiểm Tra (Verification)

- **TypeScript Type-check**: `npx tsc --noEmit` hoàn thành với **0 lỗi**.
- **Production Build**: `npm run build` tạo thành công bundle sản xuất (`dist/assets/index-iA57vidF.js`) trong **3.58s**.
