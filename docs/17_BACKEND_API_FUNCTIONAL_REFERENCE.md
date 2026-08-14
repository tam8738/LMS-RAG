# Backend API Functional Reference

**Phạm vi:** Backend LMS-RAG (`/api/v1/**`)
**Nguồn sự thật:** Controller trong source code backend
**Ngày cập nhật:** 2026-08-12

## 1. Quy ước đọc nhanh

- `PUBLIC`: không cần access token.
- `AUTHENTICATED`: cần access token hợp lệ.
- `TEACHER`: chỉ tài khoản giảng viên.
- `ADMIN`: chỉ tài khoản quản trị.
- Hầu hết API trả về theo khung `ApiResponse<T>`.

## 2. Authentication APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| POST | /api/v1/auth/login | PUBLIC | Đăng nhập bằng thông tin tài khoản, trả access token + refresh token. | Body `LoginRequestDTO` |
| POST | /api/v1/auth/refresh | PUBLIC | Làm mới access token và rotate refresh token. | Body `{ refreshToken }` |
| POST | /api/v1/auth/refresh/revoke | PUBLIC | Thu hồi một refresh token cụ thể. | Body `{ refreshToken }` |
| GET | /api/v1/auth/me | AUTHENTICATED | Lấy thông tin cơ bản của người dùng đang đăng nhập. | Header Authorization |
| POST | /api/v1/auth/logout | AUTHENTICATED | Đăng xuất bằng cách thu hồi access token hiện tại. | Header Authorization |

## 3. Hồ sơ cá nhân APIs (`/api/v1/me`)

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/me/profile | AUTHENTICATED | Lấy hồ sơ chi tiết của tài khoản hiện tại. | Header Authorization |
| PATCH | /api/v1/me/profile | AUTHENTICATED | Cập nhật hồ sơ cá nhân (thông tin profile). | Body `ProfileUpdateRequest` |
| POST | /api/v1/me/change-password | AUTHENTICATED | Đổi mật khẩu tài khoản hiện tại. | Body `ChangePasswordRequest` |

## 4. Document APIs cho Teacher

### 4.1 Quản lý tài liệu cá nhân

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| POST | /api/v1/documents | TEACHER | Upload tài liệu mới (file + metadata). | Multipart `file`, `metadata` |
| GET | /api/v1/my/documents | TEACHER | Lấy danh sách tài liệu của chính teacher, hỗ trợ lọc/tìm kiếm/phân trang. | Query `q`, `processingStatus`, `publicationStatus`, `subject`, `topic`, `chapter`, `tags`, `page`, `size`, `sort` |
| GET | /api/v1/my/documents/{documentId} | TEACHER | Lấy chi tiết 1 tài liệu của chính teacher. | Path `documentId` |
| PATCH | /api/v1/my/documents/{documentId} | TEACHER | Cập nhật metadata và/hoặc file của tài liệu. | Path `documentId`, multipart `metadata`, `file` (optional) |
| DELETE | /api/v1/my/documents/{documentId} | TEACHER | Xóa tài liệu của chính teacher. | Path `documentId` |
| POST | /api/v1/my/documents/{documentId}/submit-review | TEACHER | Gửi tài liệu sang luồng kiểm duyệt admin. | Path `documentId` |
| POST | /api/v1/my/documents/{documentId}/reprocess-rag | TEACHER | Yêu cầu xử lý lại RAG cho tài liệu đã công bố. | Path `documentId` |

### 4.2 Xem/tải file tài liệu theo rule phân quyền

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/documents/{documentId}/content | Theo rule service | Trả nội dung file để xem inline (preview/content). | Path `documentId` |
| GET | /api/v1/documents/{documentId}/download | Theo rule service | Tải file gốc về máy (attachment). | Path `documentId` |

Ghi chú rule trong controller:
- Owner: xem/tải theo quyền sở hữu.
- Admin: có quyền rộng hơn để quản trị.
- Public/teacher khác: bị giới hạn theo trạng thái publication.

## 5. Admin Document & Review APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/admin/documents | ADMIN | Lấy danh sách tài liệu hệ thống (không gồm nháp DRAFT), có filter + pagination. | Query filter + `page`, `size`, `sort` |
| GET | /api/v1/admin/documents/{documentId} | ADMIN | Lấy chi tiết tài liệu đã gửi duyệt. | Path `documentId` |
| GET | /api/v1/admin/reviews | ADMIN | Lấy hàng chờ duyệt (review queue) bản danh sách nhanh. | Không bắt buộc |
| GET | /api/v1/admin/reviews/page | ADMIN | Lấy hàng chờ duyệt có phân trang, hỗ trợ tìm kiếm. | Query `q`, `page`, `size`, `sort` |
| GET | /api/v1/admin/reviews/{documentId} | ADMIN | Lấy chi tiết 1 tài liệu trong luồng review. | Path `documentId` |
| POST | /api/v1/admin/reviews/{documentId}/approve | ADMIN | Duyệt tài liệu. | Path `documentId` |
| POST | /api/v1/admin/reviews/{documentId}/reject | ADMIN | Từ chối tài liệu với lý do. | Path `documentId`, body `RejectReviewRequest` |
| POST | /api/v1/admin/documents/{documentId}/archive | ADMIN | Lưu trữ tài liệu đã công bố. | Path `documentId` |

## 6. Admin Teacher Management APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/admin/teachers | ADMIN | Tìm kiếm/lọc danh sách giảng viên có phân trang. | Query `TeacherSearchRequest` |
| POST | /api/v1/admin/teachers | ADMIN | Tạo một tài khoản giảng viên mới. | Body `TeacherCreateRequest` |
| POST | /api/v1/admin/teachers/batch | ADMIN | Tạo nhiều tài khoản giảng viên một lần (partial success). | Body `TeacherBatchCreateRequest` |
| PATCH | /api/v1/admin/teachers/{teacherId} | ADMIN | Cập nhật thông tin giảng viên theo kiểu partial update. | Path `teacherId`, body `TeacherUpdateRequest` |
| POST | /api/v1/admin/teachers/{teacherId}/activate | ADMIN | Kích hoạt tài khoản giảng viên. | Path `teacherId` |
| POST | /api/v1/admin/teachers/{teacherId}/deactivate | ADMIN | Vô hiệu hóa tài khoản giảng viên. | Path `teacherId` |
| POST | /api/v1/admin/teachers/{teacherId}/reset-password | ADMIN | Đặt lại mật khẩu giảng viên. | Path `teacherId` |

## 7. Library APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/library | PUBLIC | Lấy danh sách tài liệu đã công bố trong thư viện công khai. | Query `subject`, `topic`, `chapter`, `q`, `tags`, `uploadedBy`, `page`, `size`, `sort` |
| GET | /api/v1/library/{documentId} | PUBLIC | Lấy chi tiết một tài liệu trong thư viện. | Path `documentId` |

## 8. Quiz APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| POST | /api/v1/quiz/generate | TEACHER | Sinh quiz từ document và lưu vào hệ thống. | Body `QuizGenerateRequest` |
| GET | /api/v1/quiz/my | TEACHER | Lấy danh sách quiz của teacher hiện tại (danh sách nhanh). | Header Authorization |
| GET | /api/v1/quiz/my/page | TEACHER | Lấy danh sách quiz có phân trang + tìm kiếm + lọc trạng thái. | Query `q`, `status`, `page`, `size`, `sort` |
| GET | /api/v1/quiz/public/{quizId} | PUBLIC | Lấy quiz đã publish cho người học/public. | Path `quizId` |
| GET | /api/v1/quiz/{quizId} | TEACHER | Lấy chi tiết quiz của teacher hiện tại. | Path `quizId` |
| PATCH | /api/v1/quiz/{quizId} | TEACHER | Sửa quiz (thường cho trạng thái draft). | Path `quizId`, body `QuizUpdateRequest` |
| POST | /api/v1/quiz/{quizId}/publish | TEACHER | Publish quiz để public có thể truy cập. | Path `quizId` |
| DELETE | /api/v1/quiz/{quizId} | TEACHER | Xóa quiz draft. | Path `quizId` |

## 9. RAG APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| POST | /api/v1/rag/answer | TEACHER/ADMIN | Hỏi đáp RAG trên tập tài liệu hợp lệ, trả câu trả lời có/không có context phù hợp. | Body `RagAnswerRequest` |

## 10. RAG Conversation History APIs

| Method | Endpoint | Quyền | Chức năng | Input chính |
|---|---|---|---|---|
| GET | /api/v1/rag/conversations/by-document/{documentId} | TEACHER/ADMIN | Lấy hoặc tạo conversation theo user + document. | Path `documentId` |
| POST | /api/v1/rag/conversations/{conversationId}/messages | TEACHER/ADMIN | Gửi câu hỏi mới vào conversation, backend lưu lịch sử và trả câu trả lời. | Path `conversationId`, body `RagSendMessageRequest` |
| GET | /api/v1/rag/conversations/{conversationId}/messages | TEACHER/ADMIN | Lấy lịch sử messages của conversation có phân trang. | Path `conversationId`, query `page`, `size`, `sort` |
| DELETE | /api/v1/rag/conversations/{conversationId}/messages | TEACHER/ADMIN | Xóa toàn bộ lịch sử hội thoại của conversation. | Path `conversationId` |

## 11. Swagger/OpenAPI endpoints

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | /swagger-ui.html | PUBLIC | Mở giao diện Swagger UI |
| GET | /swagger-ui/** | PUBLIC | Resource của Swagger UI |
| GET | /v3/api-docs | PUBLIC | Trả OpenAPI JSON |
| GET | /v3/api-docs/** | PUBLIC | Resource OpenAPI |

## 12. Nguồn đối chiếu code

- `backend/src/main/java/com/lmsrag/backend/controller/AuthController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/MeController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/DocumentController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/AdminDocumentController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/admin/TeacherAdminController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/LibraryController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/QuizController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/RagController.java`
- `backend/src/main/java/com/lmsrag/backend/controller/RagConversationController.java`
