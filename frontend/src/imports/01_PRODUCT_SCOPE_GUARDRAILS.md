# Product Scope & Guardrails

## 1. Product definition

Đây là **Document-centric AI Knowledge Library dành cho giảng viên**.

Đây **không phải LMS đầy đủ** và cũng không phải:

- thư viện bài báo nghiên cứu;
- mạng xã hội học thuật;
- kho paper quốc tế;
- dashboard analytics;
- hệ thống Course/Lecture;
- nền tảng dành cho Student trong MVP.

Đối tượng tài liệu là học liệu phục vụ giảng dạy:

- giáo trình;
- slide bài giảng;
- tài liệu thực hành;
- tài liệu ôn tập;
- PDF;
- TXT.

## 2. Actors

### Teacher

- đăng nhập;
- xem Library;
- tìm kiếm/lọc tài liệu đã công bố;
- xem/tải tài liệu;
- hỏi đáp RAG trên tài liệu được chọn;
- upload tài liệu;
- quản lý My Documents;
- chỉnh metadata khi được phép;
- submit review;
- xem trạng thái xử lý và xuất bản.

### Admin

- đăng nhập;
- xem Library;
- xem hàng chờ review;
- approve;
- reject kèm lý do;
- archive tài liệu đã publish;
- không upload tài liệu;
- không có My Documents cá nhân.

### Student

Out of scope trong MVP. Không tạo UI hoặc flow Student.

## 3. Core business objects

- Document
- User
- Processing Job
- Document Chunk
- RAG Conversation/messages nếu triển khai multi-turn

Không dùng Course, Lecture, Assignment, Quiz hoặc Student Result.

## 4. Core states

### Processing status

- UPLOADED
- PROCESSING
- PROCESSED
- FAILED

### Publication status

- DRAFT
- PENDING_REVIEW
- PUBLISHED
- REJECTED
- ARCHIVED

Hai status phải hiển thị riêng.

## 5. Core flows

### Upload and processing

Teacher upload PDF/TXT + metadata  
→ Backend validate  
→ `UPLOADED + DRAFT`  
→ AI xử lý nền  
→ `PROCESSING`  
→ `PROCESSED` hoặc `FAILED`

### Review and publication

`DRAFT/REJECTED` + `PROCESSED`  
→ Teacher submit review  
→ `PENDING_REVIEW`  
→ Admin approve thành `PUBLISHED`  
hoặc reject thành `REJECTED`  
→ Admin có thể archive tài liệu `PUBLISHED`

### Library and RAG

Teacher/Admin mở Library  
→ chỉ thấy `PUBLISHED`  
→ search/filter  
→ mở Document Detail  
→ chọn tài liệu và hỏi AI  
→ nhận câu trả lời có citation hoặc `not_found`

## 6. Must-have features

- Login Teacher/Admin
- Library
- Search/filter theo metadata
- Document detail
- Download file gốc
- My Documents cho Teacher
- Upload PDF/TXT tối đa 20 MB
- Processing state
- Submit review
- Admin review
- Approve/reject/archive
- RAG theo `document_ids`
- Citations
- `not_found`
- Multi-turn conversation theo quyết định đã chốt
- Logout

## 7. Should-have

- PDF preview in-app
- Summary
- Question generation
- Chat history
- Teacher account management
- Subjects table riêng

Không đẩy các mục này lên thành flow trung tâm của MVP.

## 8. Forbidden invented features

Không tự thêm:

- Popular Documents
- Trending
- View count
- Like/favorite
- Community
- Social feed
- Research metrics
- Citation network
- Rankings
- Recommendations
- Gamification
- Quiz
- Course
- Lecture
- Student dashboard
- Revenue/analytics
- Complex admin dashboard
- RAG toàn bộ Library không chọn document scope

## 9. Content tone

Nội dung mẫu phải đúng domain giáo dục và học liệu:

- “Lập trình Web với React”
- “Cấu trúc dữ liệu và giải thuật”
- “Mạng máy tính căn bản”
- “Hướng dẫn thực hành Cơ sở dữ liệu”
- “Tài liệu ôn tập Trí tuệ nhân tạo”

Không dùng nội dung kiểu research paper quốc tế.

## 10. Priority rule

Nếu thiết kế xung đột với nghiệp vụ:

> Nghiệp vụ thắng thiết kế.
