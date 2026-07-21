# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN

## 1. Tổng quan dự án hiện tại

LMS-RAG là hệ thống thư viện học liệu có hỗ trợ hỏi đáp bằng RAG. RAG là kỹ thuật tìm các đoạn liên quan trong tài liệu trước khi AI trả lời, nhờ đó câu trả lời có thể đi kèm trích dẫn để người dùng kiểm chứng.

Bài toán của dự án xuất phát từ việc giảng viên lưu bài giảng, giáo trình và tài liệu tham khảo ở nhiều nơi khác nhau. Hệ thống hướng tới việc tập trung tài liệu, kiểm duyệt trước khi dùng chung, hỗ trợ tìm kiếm và khai thác nội dung nhanh phục vụ giảng dạy.

Dự án không phát triển như một LMS đầy đủ. Đơn vị trung tâm là Document, tức tài liệu PDF/TXT. Môn học, chủ đề, chương và nhãn là metadata dùng để phân loại, tìm kiếm và hỗ trợ RAG; không phải Course hoặc Lecture bắt buộc phải tạo trước khi tải lên.

Các đối tượng sử dụng trong phạm vi hiện tại:

- Giảng viên: tải lên, quản lý, gửi duyệt, sử dụng thư viện, tải file và hỏi đáp trên tài liệu đã sẵn sàng.
- Quản trị viên: duyệt/từ chối/lưu trữ tài liệu và quản lý tài khoản giảng viên.
- Student chỉ còn trong dữ liệu nền; chưa có giao diện, API hoặc luồng nghiệp vụ. Nội dung này nằm ngoài core MVP.

Hệ thống gồm Frontend React/Vite, Backend Spring Boot, AI Service FastAPI và PostgreSQL có pgvector. Frontend giao tiếp với Backend bằng JWT. Backend quản lý nghiệp vụ, quyền truy cập và gọi AI Service bằng khóa nội bộ. Backend và AI Service dùng chung vùng lưu file khi chạy Docker.

## 2. Những nội dung đã điều chỉnh

Dự án đã chuyển từ hướng Course/Lecture sang document-centric. Giảng viên có thể tải tài liệu trực tiếp và gắn metadata cần thiết. Điều chỉnh này rút gọn luồng demo, phù hợp mục tiêu thư viện học liệu và tránh mở rộng thành hệ thống quản lý lớp học.

Luồng AI được tách thành hai giai đoạn:

1. Sau tải lên, AI chỉ phân tích xem tài liệu có thể xử lý RAG hay không.
2. Sau khi Admin duyệt, AI mới đọc nội dung, chia đoạn, tạo embedding và lập chỉ mục RAG.

Cách làm này tránh chi phí xử lý cho tài liệu chưa được duyệt. Trạng thái xử lý AI và trạng thái công bố cũng được lưu riêng để phân biệt tài liệu đang phân tích, chờ duyệt, đang lập chỉ mục hoặc đã sẵn sàng hỏi đáp.

RAG đã chuyển từ hỏi đáp độc lập sang có lịch sử theo từng người dùng và từng tài liệu. Backend lưu hội thoại; AI Service nhận các lượt gần nhất để hiểu câu hỏi nối tiếp nhưng không tự lưu lịch sử. Một số tài liệu kiểm thử cũ vẫn nói về Course, Lecture và Student; đây là dấu vết của hướng trước, không phản ánh source code hiện tại.

## 3. Các chức năng đã thực hiện

### Backend

- Đăng nhập JWT, lấy thông tin người dùng hiện tại và API đăng xuất.
- Tải PDF/TXT, kiểm tra loại/kích thước file, lưu file trong vùng dùng chung với AI Service.
- Tạo, xem, cập nhật, thay file hoặc xóa tài liệu của giảng viên.
- Tự gọi AI phân tích sau tải lên; lưu khả năng RAG, số trang, số token/chunk ước tính và thông tin lỗi.
- Gửi duyệt, duyệt, từ chối kèm lý do và lưu trữ tài liệu.
- Thư viện có tìm kiếm/lọc metadata, xem chi tiết/nội dung và tải file gốc theo quyền.
- API RAG kiểm tra quyền, trạng thái công bố và trạng thái lập chỉ mục trước khi gọi AI.
- Lưu lịch sử hội thoại: tạo/mở hội thoại theo tài liệu, gửi tin nhắn, tải lại và xóa lịch sử.
- Quản lý giảng viên của Admin đã hoàn thành theo kế hoạch: xem danh sách/chi tiết, thống kê tài liệu, tạo/cập nhật, kích hoạt/vô hiệu hóa và đặt lại mật khẩu.

### Frontend

- Đăng nhập, khôi phục phiên và bảo vệ route theo vai trò.
- Thư viện: danh sách, tìm kiếm/lọc, chi tiết tài liệu, xem nội dung và tải file.
- Tài liệu cá nhân: danh sách, tải lên, sửa metadata/thay file, gửi duyệt, xóa và yêu cầu lập chỉ mục lại.
- Hàng chờ duyệt, trang duyệt chi tiết và quản lý giảng viên cho Admin.
- Khung hỏi đáp hiển thị trạng thái chờ/lỗi/not-found, câu trả lời, trích dẫn, lịch sử, xác nhận xóa lịch sử và cuộn hội thoại.
- Đã kiểm thử thủ công với các tài khoản Teacher; tải lại trang vẫn tải được lịch sử và tiếp tục hỏi đáp.

Hồ sơ người dùng hiện gọi API cập nhật tên và đổi mật khẩu nhưng Backend chưa có endpoint tương ứng, nên chưa hoàn chỉnh. Gợi ý “tạo câu hỏi ôn tập” chỉ gửi một câu lệnh vào chat, chưa phải quiz độc lập.

### AI Service

- Kiểm tra file, đọc PDF/TXT, làm sạch nội dung và chia đoạn theo token.
- Tạo embedding bằng OpenAI, lưu/ghi đè dữ liệu đoạn và vector vào pgvector.
- Cung cấp API phân tích, lập chỉ mục, hỏi đáp và kiểm tra sức khỏe.
- Tìm kiếm theo document IDs do Backend kiểm quyền.
- Kết hợp tìm kiếm vector và từ khóa, lấy đoạn lân cận, loại trùng và lọc theo mức liên quan.
- Sinh câu trả lời có trích dẫn; hỗ trợ tóm tắt, câu hỏi nối tiếp và làm sạch Markdown cơ bản.

Chất lượng trả lời thực tế vẫn phụ thuộc tài liệu đã được lập chỉ mục đúng, PDF có thể đọc được và khóa OpenAI hợp lệ.

### Database và môi trường triển khai

- Database đã có migration cho tài khoản, tài liệu, job xử lý, đoạn/vector, hội thoại RAG và tin nhắn RAG.
- PostgreSQL dùng pgvector; Backend quản lý migration, AI Service ghi/truy vấn đoạn và vector.
- Docker Compose có Backend, AI Service, PostgreSQL/pgvector, pgAdmin và vùng lưu file dùng chung.
- Khi kiểm tra, các container cần thiết đang chạy; PostgreSQL và AI Service báo healthy.
- Frontend build thành công. Backend có 15 kiểm thử qua, trong đó một kiểm thử khởi động được bỏ qua. AI Service có 150 kiểm thử qua.

## 4. Luồng hệ thống hiện đã thực hiện được

Luồng sử dụng hiện có thể chạy theo chuỗi:

Giảng viên đăng nhập -> tải PDF/TXT và metadata -> Backend lưu file, tạo Document, gọi AI phân tích -> Giảng viên gửi duyệt -> Admin duyệt -> Backend gọi AI lập chỉ mục -> tài liệu xuất hiện trong thư viện -> người dùng mở tài liệu đã sẵn sàng -> tạo/mở lại hội thoại -> hỏi đáp và nhận câu trả lời kèm trích dẫn.

Các module trong luồng đã được nối trong code và môi trường nền đang chạy. Theo kiểm thử thủ công của nhóm, tài khoản Teacher hoạt động ổn định và người dùng có thể tải lại trang để tiếp tục hội thoại. Vẫn cần kiểm thử đầy đủ luồng bằng dữ liệu thật và kịch bản thống nhất trước khi nghiệm thu MVP.

## 5. Các phần chưa hoàn thiện

- Sinh quiz chuyên biệt chưa có API AI, dữ liệu lưu quiz, bước giảng viên xem lại/chỉnh sửa/công bố hay trang làm bài.
- Cần kiểm thử liên thông toàn bộ luồng với dữ liệu thật, gồm lỗi AI, tài liệu không hỗ trợ RAG và các quyền truy cập khác nhau.
- Cần hoàn thiện API hồ sơ người dùng hoặc gỡ các lời gọi chưa tồn tại ở Frontend. Đăng xuất trên giao diện chủ yếu xóa token cục bộ, chưa dùng API Backend để blacklist token.
- README và một số snapshot cũ chưa khớp code hiện tại. Code cho phép truy cập công khai thư viện, trong khi PRD mô tả thư viện sau đăng nhập; cần chốt lại quyền truy cập và cập nhật tài liệu.

## 6. Kế hoạch thực hiện tiếp theo

1. Hoàn thiện API sinh quiz từ tài liệu đã lập chỉ mục, với câu hỏi/đáp án rõ ràng và chỉ dùng nội dung tài liệu.
2. Tích hợp luồng Giảng viên xác nhận sinh quiz, xem lại/chỉnh sửa trước khi công bố và chuẩn bị trang làm quiz.
3. Chạy kiểm thử end-to-end cho Teacher A, Admin và Teacher B; giữ regression test cho resume chat.
4. Kiểm thử các tình huống lỗi: file không đọc được, index lỗi, AI không phản hồi, tài liệu chưa sẵn sàng và tài khoản bị vô hiệu hóa.
5. Hoàn thiện hồ sơ, đăng xuất, quyền thư viện và cập nhật tài liệu theo trạng thái đã chốt.
6. Chuẩn bị tài liệu PDF/TXT, tài khoản demo và kịch bản từ tải lên đến hỏi đáp, sau đó đến sinh quiz.

## 7. Kết luận

Dự án đã có nền tảng MVP rõ ràng: kiến trúc bốn thành phần đang chạy; quản lý tài liệu, kiểm duyệt, quản lý giảng viên, lập chỉ mục RAG, hỏi đáp có trích dẫn và lịch sử hội thoại đều đã có API hoặc giao diện tương ứng.

Phần trọng tâm chưa hoàn thiện là sinh quiz và kiểm thử liên thông toàn bộ luồng bằng dữ liệu thật. Sau khi hoàn thiện quiz, xử lý các chênh lệch nhỏ giữa API, giao diện và tài liệu, hệ thống sẽ đủ cơ sở để trình bày như một MVP hoàn chỉnh.
