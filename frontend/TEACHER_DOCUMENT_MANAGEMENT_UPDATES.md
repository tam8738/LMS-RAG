# Báo cáo Cập nhật - Teacher Document Management Module

Báo cáo này tóm tắt toàn bộ các cải tiến giao diện, tối ưu hóa trải nghiệm người dùng (UX), và đảm bảo an toàn bộ nhớ cho phân hệ Quản lý Học liệu của Giảng viên (Teacher Document Management) đã được triển khai thành công.

---

## 1. Danh sách các file chỉnh sửa

* **[documentHelpers.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/utils/documentHelpers.ts)**: Quy chuẩn hóa các helper kiểm tra điều kiện thao tác (`canEditDocumentMetadata`, `canReplaceDocumentFile`, `canSubmitDocumentForReview`, `canDeleteDocument`, `canRetryProcessing`) đồng bộ với ma trận nghiệp vụ Backend. Loại bỏ các helper không sử dụng.
* **[teacherDocumentService.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/services/teacherDocumentService.ts)**: Triển khai phương thức `updateDocumentWithProgress` sử dụng `XMLHttpRequest` để lắng nghe tiến trình upload thực tế (%) và đăng ký callback hủy tải lên (`xhr.abort`).
* **[MyDocumentActionMenu.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/components/MyDocumentActionMenu.tsx)**: Chuyển sang sử dụng các helper mới, đính kèm menu trực tiếp vào `document.body` qua React Portal để không bị cắt bởi ranh giới bảng. Bổ sung hỗ trợ phím mũi tên `ArrowUp/ArrowDown` để di chuyển nhanh và tự động đặt focus vào mục đầu tiên khi mở menu.
* **[MyDocumentsPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/MyDocumentsPage.tsx)**: Truyền prop `disabled` làm mờ trigger button khi parent đang xử lý yêu cầu bất đồng bộ. Tích hợp hộp thoại xác nhận lập chỉ mục lại AI (Reprocess RAG). Xử lý lùi trang khi xóa dòng duy nhất còn lại của phân trang.
* **[MyDocumentDetailPage.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/pages/MyDocumentDetailPage.tsx)**:
  * Tích hợp khối thông tin tệp gốc mới.
  * Tích hợp Spacious Edit Metadata Modal (Option B) gọn gàng, rộng rãi.
  * Tích hợp Replace File Modal hỗ trợ 2 pha trực quan (Tải lên XHR có % thực tế & nút Hủy, Phân tích AI ngầm có thanh trượt shimmer).
  * Tích hợp hộp thoại xác nhận xóa tài liệu và điều hướng về danh sách.
  * Tích hợp hộp thoại xác nhận lập chỉ mục lại AI (Reprocess RAG).
  * Cài đặt cơ chế an toàn bộ nhớ `isMountedRef` chặn cập nhật trạng thái khi component đã unmount.
* **[documentMapper.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/mappers/documentMapper.ts)** & **[document.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/types/document.ts)**: Mở rộng kiểu dữ liệu và mapper hỗ trợ lưu trữ `originalFilename` và `fileVersion` từ API Backend.

---

## 2. Chi tiết kỹ thuật các chức năng đã hoàn thiện

### A. Khắc phục cuộn dọc lồng trong bảng (Table Scroll Fix)
* **Giải pháp:** Loại bỏ toàn bộ các thuộc tính chiều cao cố định hoặc giới hạn cuộn dọc (`max-h-X`, `overflow-y-auto`) tại khung chứa bảng. Bảng tự động giãn chiều cao theo số lượng dòng dữ liệu, trình duyệt/trang chịu trách nhiệm cuộn dọc tự nhiên.
* Cuộn ngang chỉ kích hoạt khi màn hình thu hẹp hơn `900px` thông qua phần bao ngoài `<div className="overflow-x-auto">`.
* Khối phân trang (Pagination) đặt ngoài vùng cuộn ngang nhưng nằm gọn gàng bên trong khung bo góc của bảng.

### B. Menu thao tác dạng Portal và Phím tắt điều hướng (Action Menu Portal & Accessibility)
* **Portal gắn body:** Dropdown menu được gắn trực tiếp vào `document.body` thông qua `createPortal` để đảm bảo không bị che khuất ở dòng cuối bảng.
* **Auto-Flip:** Tự động tính toán toạ độ viewport, tự động lật ngược hướng lên trên nếu không đủ không gian phía dưới trigger.
* **Phím tắt điều hướng:**
  * Phím `Escape` đóng nhanh menu và tự động trả lại tiêu điểm (focus restore) cho nút kích hoạt.
  * Lắng nghe phím `ArrowDown`/`ArrowUp` để di chuyển focus mượt mà giữa các nút thao tác bên trong menu.
  * Đóng menu ngay khi click chuột bên ngoài.

### C. Chỉnh sửa mô tả rộng rãi (Spacious Edit Metadata UX)
* **Giao diện:** Thiết kế theo cấu trúc Form Modal rộng rãi (`max-w-[640px]`), nhãn trường rõ ràng, khoảng cách thoáng đãng.
* **Xử lý nhãn (Tags):** Tự động cắt khoảng trắng thừa, chuẩn hóa về chữ thường và loại bỏ các nhãn bị trùng lặp trước khi gửi đi.
* **Gửi dữ liệu:** Gửi bằng `FormData` kèm metadata JSON Blob, **không đính kèm trường file** đúng theo hợp đồng Backend PATCH.
* **Cập nhật:** Chỉ cập nhật trạng thái cục bộ và ghi nhận nhãn thời gian `"Đã cập nhật lúc HH:mm"` (dựa vào `backendResponse.updatedAt`) sau khi nhận HTTP 200 thành công từ máy chủ.

### D. Tải lên tệp thay thế nâng cao (Replace File UX with XHR Progress & Cancel)
* **Theo dõi tiến trình thực tế:** Gọi API bằng `XMLHttpRequest` truyền thống giúp lấy sự kiện `xhr.upload.progress` thực tế theo phần trăm (`%`).
* **Hủy tải lên (Cancel/Abort):** Nút **"Hủy bỏ tải lên"** hiển thị rõ ràng trong quá trình truyền file, gọi lệnh `xhr.abort()` để chấm dứt kết nối ngay lập tức và khôi phục giao diện rảnh rỗi mà không bắn thông báo lỗi kết nối.
* **Phân tách 2 pha trực quan:**
  * **Pha A (Tải lên):** Thanh tiến trình màu xanh lam thể hiện % tải file thực tế lên máy chủ.
  * **Pha B (Phân tích):** Sau khi tải lên thành công 100%, thanh tiến trình chuyển sang hiệu ứng trượt vô tận màu vàng hổ phách, thể hiện Backend đang chạy tiến trình phân tích AI không đồng bộ.
* **Polling ngầm:** Cập nhật tài liệu cục bộ kích hoạt vòng lặp Polling ngầm sẵn có mỗi 2.5s để theo dõi cho tới khi AI phân tích hoàn tất (`ANALYZED` hoặc `FAILED`). Vòng lặp Polling tự động dọn dẹp (clear) khi rời trang hoặc unmount.

### E. Lập chỉ mục lại AI (Teacher Reprocess RAG)
* **Hộp thoại xác nhận:** Xuất hiện hộp thoại hỏi ý kiến giáo viên trước khi gửi yêu cầu lập chỉ mục lại.
* **Kiểm soát trạng thái:** Khóa các hành động tương tác bằng cờ `isReprocessing` khi đang gọi API để ngăn chặn gửi trùng lặp.
* **Cập nhật:** Nhận phản hồi cập nhật trạng thái tài liệu về `PROCESSING` để vòng lặp Polling hiện tại theo dõi kết quả trích xuất tự động.

### F. An toàn bộ nhớ & Chặn cảnh báo rò rỉ (Memory Safety)
* **XHR Listeners:** Toàn bộ listener (`load`, `error`, `abort`, `progress`) được remove khỏi đối tượng `XMLHttpRequest` ngay sau khi kết thúc hoặc hủy bỏ tải lên.
* **Component Unmount Safety:** Khai báo cờ `isMountedRef` (sử dụng `useRef(true)`) tại trang chi tiết. Mọi hàm xử lý bất đồng bộ (Edit, Replace, Delete, Reprocess) đều kiểm tra điều kiện `isMountedRef.current === true` trước khi thay đổi State của React để loại bỏ triệt để cảnh báo *"React state update on unmounted component"*.

---

## 3. Kết quả xác minh hệ thống (TypeScript Verification)

* Đã thực hiện biên dịch kiểm tra tĩnh toàn bộ mã nguồn Frontend:
  ```powershell
  npx tsc --noEmit
  ```
* Kết quả: **Thành công 100% không phát hiện bất kỳ lỗi biên dịch nào**.
