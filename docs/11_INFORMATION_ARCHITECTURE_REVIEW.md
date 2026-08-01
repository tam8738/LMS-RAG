# Information Architecture Review - LMS-RAG

**Phiên bản:** 1.1  
**Cập nhật:** 01/08/2026  
**Nguồn:** Đối chiếu với route và màn hình FE hiện tại

---

## 1. Navigation Structure

### Navigation theo role

**Teacher:**
- Thư viện (`/library`)
- Tài liệu của tôi (`/my-documents`)
- Quản lý Quiz (`/quizzes`)
- Tải lên (`/upload`)

**Admin:**
- Quản lý tài liệu (`/admin/documents`)
- Hàng chờ duyệt (`/admin/reviews`)
- Quản lý giảng viên (`/admin/teachers`)

**Guest/Public:**
- Thư viện (`/library`)
- Link quiz public (`/quiz/public/:quizId`) nếu có đường dẫn chia sẻ

### Ghi chú điều hướng

Admin không dùng giao diện thư viện chung làm màn hình chính. Thay vào đó, Admin có trang quản lý toàn bộ tài liệu trong hệ thống để xem danh sách, lọc/tìm, mở chi tiết, tải file gốc và lưu trữ tài liệu đã công bố. Thư viện `/library` vẫn là không gian xem tài liệu đã công bố cho Teacher/Guest.

---

## 2. Route / Component Mapping

| Route | Component | Ghi chú |
|---|---|---|
| `/login` | LoginPage | Đăng nhập Teacher/Admin |
| `/library` | LibraryPage | Danh sách tài liệu đã công bố |
| `/library/:documentId` | LibraryDocumentDetailPage | Chi tiết tài liệu đã công bố + AI workspace nếu đủ điều kiện |
| `/my-documents` | MyDocumentsPage | Teacher quản lý tài liệu cá nhân |
| `/upload` | UploadDocumentPage | Teacher tải tài liệu lên |
| `/my-documents/:documentId` | MyDocumentDetailPage | Teacher xem/sửa/gửi duyệt tài liệu của mình |
| `/admin/documents` | AdminDocumentManagementPage | Admin quản lý toàn bộ tài liệu hệ thống |
| `/admin/documents/:documentId` | AdminDocumentDetailPage | Admin xem chi tiết, tải file, duyệt/từ chối nếu đang chờ duyệt, lưu trữ nếu đã công bố |
| `/admin/reviews` | AdminReviewQueuePage | Danh sách tài liệu đang chờ duyệt |
| `/admin/reviews/:documentId` | AdminReviewDetailPage | Luồng duyệt/từ chối tài liệu chờ duyệt |
| `/admin/teachers` | AdminTeacherManagementPage | Admin quản lý tài khoản giảng viên |
| `/quizzes` | QuizManagementPage | Teacher sinh, chỉnh sửa, công bố và lấy link quiz |
| `/quiz/public/:quizId` | PublicQuizPage | Người học làm quiz qua link chia sẻ |

---

## 3. Quyết Định IA Hiện Tại

- Hệ thống đi theo hướng document-centric: tài liệu là trung tâm của upload, duyệt, công bố, hỏi đáp AI và sinh quiz.
- Teacher có workspace tài liệu cá nhân và workspace quiz.
- Admin có không gian quản trị riêng, tách khỏi thư viện người dùng.
- Admin không upload tài liệu thay Teacher và không có `/my-documents`.
- Hàng chờ duyệt vẫn giữ riêng để Admin xử lý nhanh các tài liệu `PENDING_REVIEW`.
- Trang quản lý tài liệu Admin dùng cho việc nhìn toàn cục và thao tác nhanh với tất cả trạng thái tài liệu.

---

## 4. Gaps Còn Cần Theo Dõi

| # | Gap | Mức độ | Ghi chú |
|---|---|---|---|
| IA1 | Breadcrumb chi tiết giữa các khu vực chưa thống nhất hoàn toàn | Low | Có thể bổ sung sau khi ổn định báo cáo/demo |
| IA2 | Admin document list mới có lọc cơ bản theo trạng thái và từ khóa | Low | Nếu cần báo cáo/thống kê sâu có thể bổ sung filter theo giảng viên/môn học |
| IA3 | Một số màn cũ vẫn dùng wording Library thay vì Thư viện/Tài liệu tùy ngữ cảnh | Low | Dọn dần khi hoàn thiện UI copy |

---

## 5. Tổng Kết

IA hiện tại đã tách rõ ba không gian chính: Teacher quản lý tài liệu cá nhân, Admin quản lý tài liệu hệ thống và thư viện công bố cho người dùng xem. Cách tách này phù hợp với MVP hiện tại vì Admin cần thao tác quản trị toàn cục, còn Teacher cần tập trung vào tài liệu của mình và các chức năng AI/Quiz đi kèm.