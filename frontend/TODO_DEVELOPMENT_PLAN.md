# Kế Hoạch Phát Triển & Các Hạng Mục Cần Bổ Sung (TODO Development Plan)

Tài liệu này tổng hợp toàn bộ các tính năng, cải tiến và sửa lỗi cần triển khai tiếp theo cho dự án **LMS-RAG**, được chia theo từng phân hệ (Backend, AI Service, Frontend) dựa trên khoảng trống thiết kế (Gap Analysis) và thực tế phát triển.

---

## 1. ⚙️ Phân hệ AI Service (FastAPI)

Phía AI hiện đã hoạt động ổn định cho luồng tách nhỏ tài liệu (**Chunking**) và sinh vector (**Embedding**). Để hoàn thiện luồng hỏi đáp (RAG) và tích hợp hoàn chỉnh với LLM, cần bổ sung:

* [ ] **Tích hợp hội thoại đa lượt (Stateless Multi-turn Chat):**
  * Cập nhật hàm `answer` trong `AnswerQuestionService` để đọc trường `history` từ Request.
  * Xây dựng Prompt Builder: kết hợp danh sách tin nhắn lịch sử (`history`), các đoạn trích dẫn (context) và câu hỏi mới thành một chuỗi tin nhắn hội thoại có thứ tự để gửi cho OpenAI Chat Completion API.
* [ ] **Cấu hình Similarity Threshold:**
  * Hiện thực bộ lọc kết quả tìm kiếm tương đồng vector (`RAG_SIMILARITY_THRESHOLD`) để chỉ giữ lại các chunk có điểm số (score) cao hơn ngưỡng cấu hình (tránh việc lấy các chunk không liên quan đưa vào prompt).
* [ ] **Chiến lược xử lý lỗi & Retry khi gọi OpenAI:**
  * Cài đặt cơ chế tự động thử lại (Retry với Exponential Backoff) khi gọi API của OpenAI gặp lỗi giới hạn lượt gọi (Rate Limit) hoặc lỗi mạng.
  * Cache lại kết quả embedding của các chunk nếu quá trình ghi vào Database gặp lỗi, tránh việc phải gọi OpenAI sinh embedding lại cho cùng một nội dung khi thực hiện ghi lại (retry insert).

---

## 2. ☕ Phân hệ Backend (Spring Boot)

Cần bổ sung các tính năng bảo mật, quản lý phiên và xử lý lỗi hệ thống:

* [ ] **Cơ chế Refresh Token:**
  * Hiện tại Access Token (JWT) có thời hạn ngắn nhưng chưa có luồng cấp lại token. Cần định nghĩa thực thể `RefreshToken` lưu trong DB, API cấp lại token `/api/v1/auth/refresh` và luồng thu hồi token khi đăng xuất.
* [ ] **Vô hiệu hóa tài khoản tức thì (User Deactivation Flow):**
  * Khi trạng thái User chuyển sang `INACTIVE`, Filter bảo mật cần chặn mọi request đang sử dụng JWT của user đó ngay lập tức (kết hợp với cơ chế kiểm tra trạng thái hoạt động trong DB hoặc blacklist cache).
* [ ] **Tối ưu hóa Transaction khi xử lý tài liệu:**
  * Giải quyết xung đột đọc/ghi: Khi Teacher yêu cầu xử lý lại tài liệu (`reprocess-rag`), cần có cơ chế cô lập hoặc đánh dấu trạng thái để các RAG query đồng thời từ học viên không bị trả về 0 chunk do dữ liệu cũ bị xóa trước khi dữ liệu mới được lưu xong.
* [ ] **Xử lý Atomic Rollback khi Upload lỗi:**
  * Khi quá trình phân tích hoặc lưu trữ tài liệu thất bại ở bất cứ bước nào (DB hoặc AI Service), hệ thống phải tự động dọn dẹp file vật lý đã lưu trên đĩa để tránh rác hệ thống (Atomic File Rollback).
* [ ] **Rate Limiting & Bảo mật:**
  * Cấu hình giới hạn tần suất gửi yêu cầu (Rate Limiting) trên các endpoint tốn tài nguyên như upload tài liệu và câu hỏi RAG.

---

## 3. 💻 Phân hệ Frontend (React + Vite)

Cần đồng bộ giao diện với API thật của Backend và hoàn thiện trải nghiệm người dùng (UX):

* [ ] **Tích hợp RAG Chat Panel:**
  * Thay thế mock service cũ bằng [ragService.ts](file:///d:/LMS/LMS-RAG/frontend/src/app/services/ragService.ts) thực tế gọi qua API `/api/v1/rag/answer`.
  * Duy trì và cập nhật mảng `history` trong state của React sau mỗi lượt hỏi-đáp để truyền chính xác lịch sử chat lên Backend.
* [ ] **Hiển thị nguồn trích dẫn (Citations):**
  * Sử dụng component [CitationList.tsx](file:///d:/LMS/LMS-RAG/frontend/src/app/components/CitationList.tsx) để hiển thị danh sách tài liệu nguồn, trang số và đoạn trích dẫn tương ứng dưới câu trả lời của AI.
* [ ] **Xử lý UX cho các trạng thái lỗi:**
  * Hiển thị trạng thái thông báo lỗi rõ ràng khi tài liệu rỗng (`EMPTY_DOCUMENT`) hoặc lỗi trong quá trình xử lý RAG.
  * Bổ sung nút **Thử lại (Retry)** cho phép gửi lại yêu cầu index/xử lý tài liệu khi gặp sự cố.
* [ ] **Giao diện khôi phục mật khẩu (Forgot/Reset Password):**
  * Thiết kế trang yêu cầu reset mật khẩu và đổi mật khẩu mới cho người dùng.
