# BÁO CÁO TIẾN ĐỘ ĐỒ ÁN

## 1. Tổng quan dự án hiện tại

LMS-RAG là hệ thống thư viện học liệu cho giảng viên ngành CNTT, có tích hợp AI để hỗ trợ khai thác nội dung tài liệu. Hướng phát triển hiện tại không phải là một LMS đầy đủ theo kiểu quản lý lớp học, bài giảng, sinh viên và điểm số. Trọng tâm của dự án là quản lý tài liệu PDF/TXT, kiểm duyệt tài liệu trước khi công bố, sau đó cho phép người dùng hỏi đáp trên nội dung tài liệu bằng RAG.

RAG là kỹ thuật tìm các đoạn liên quan trong tài liệu trước, rồi mới đưa các đoạn đó cho AI sinh câu trả lời. Nhờ vậy câu trả lời có thể gắn với nguồn trích dẫn từ tài liệu thật, giúp giảng viên kiểm chứng nội dung thay vì chỉ nhận một câu trả lời chung chung.

Đơn vị trung tâm của hệ thống là Document. Các thông tin như môn học, chủ đề, chương và nhãn chỉ là metadata để phân loại, tìm kiếm và hỗ trợ ngữ cảnh; không phải Course hoặc Lecture bắt buộc phải tạo trước khi tải tài liệu lên.

Các đối tượng sử dụng trong phạm vi hiện tại gồm:

- Giảng viên: đăng nhập, tải tài liệu, quản lý tài liệu cá nhân, gửi duyệt, xem thư viện, tải file, hỏi đáp với AI trên tài liệu đã sẵn sàng, sinh/review/công bố quiz từ tài liệu.
- Quản trị viên: duyệt, từ chối, lưu trữ tài liệu và theo dõi thông tin giảng viên trong hệ thống.
- Sinh viên/người học: mở link quiz đã được giảng viên công bố, làm bài trên trang quiz public và xem kết quả ngay sau khi nộp. Luồng này không yêu cầu tài khoản Student trong MVP.

Hệ thống gồm bốn phần chính: Frontend React/Vite, Backend Spring Boot, AI Service FastAPI và PostgreSQL có pgvector. Frontend chỉ gọi Backend. Backend quản lý xác thực, phân quyền, nghiệp vụ và gọi AI Service bằng khóa nội bộ. AI Service xử lý tài liệu, tạo vector, tìm kiếm ngữ cảnh và sinh câu trả lời. Backend và AI Service dùng chung vùng lưu file khi chạy bằng Docker.

## 2. Những nội dung đã điều chỉnh

Dự án đã chuyển từ hướng Course/Lecture sang hướng document-centric. Thay vì bắt giảng viên tạo lớp học hoặc bài giảng trước, giảng viên có thể tải tài liệu trực tiếp và gắn metadata cần thiết. Điều chỉnh này giúp phạm vi gọn hơn, phù hợp với mục tiêu thư viện học liệu và giảm rủi ro mở rộng quá mức so với MVP.

Dự án cũng đã tách rõ phần chức năng non-AI và phần chức năng có AI:

- Phần non-AI chịu trách nhiệm cho nghiệp vụ nền: tài khoản, quyền truy cập, upload, kiểm duyệt, thư viện, theo dõi giảng viên, tải/xem file và lưu lịch sử hội thoại.
- Phần AI chịu trách nhiệm phân tích tài liệu, lập chỉ mục RAG, tìm kiếm đoạn liên quan, sinh câu trả lời, trả trích dẫn, hỗ trợ câu hỏi nối tiếp bằng lịch sử gần nhất và sinh quiz draft từ tài liệu đã index.

Luồng AI được chia thành hai giai đoạn. Sau khi giảng viên tải file lên, AI chỉ phân tích xem tài liệu có thể dùng cho RAG hay không. Sau khi Admin duyệt, AI mới lập chỉ mục thật bằng cách đọc nội dung, chia đoạn, tạo embedding và lưu vào pgvector. Cách làm này tránh xử lý tốn chi phí cho tài liệu chưa được công bố.

RAG cũng đã được nâng từ hỏi đáp độc lập sang có lịch sử theo từng người dùng và từng tài liệu. Backend là nơi lưu hội thoại. AI Service không tự lưu lịch sử, mà chỉ nhận một số lượt gần nhất để hiểu các câu hỏi nối tiếp như “nói chi tiết hơn”.

Một số tài liệu/test cũ trong repo từng nói về Course, Lecture và Student. Đây là dấu vết của hướng phát triển cũ, không còn là luồng chính của source code hiện tại.

## 3. Các chức năng đã thực hiện

### 3.1. Nhóm chức năng non-AI

Đây là các chức năng nghiệp vụ nền, không phụ thuộc trực tiếp vào AI để hoạt động.

**Xác thực và phân quyền**

- Đăng nhập bằng email, nhận JWT access token và refresh token.
- Có API rotate/revoke refresh token; refresh token chỉ được lưu dưới dạng hash trong database.
- Lấy thông tin người dùng hiện tại.
- Có API đăng xuất và cơ chế vô hiệu hóa token ở Backend.
- Có API xem/cập nhật hồ sơ cá nhân và đổi mật khẩu; đổi mật khẩu thu hồi toàn bộ refresh token đang hoạt động.
- Phân quyền theo vai trò Teacher/Admin ở các API chính.

**Quản lý tài liệu của giảng viên**

- Giảng viên tải lên PDF/TXT kèm metadata gồm tiêu đề, mô tả, môn học, chủ đề, chương và tags.
- Giảng viên xem danh sách tài liệu của mình, xem chi tiết, cập nhật metadata, thay file hoặc xóa tài liệu khi trạng thái cho phép.
- File gốc được lưu trong vùng storage dùng chung để Backend lưu và AI Service có thể đọc.
- Có API xem nội dung và tải file gốc theo quyền truy cập.

**Kiểm duyệt và thư viện tài liệu**

- Giảng viên gửi tài liệu đi duyệt.
- Admin xem hàng chờ duyệt, xem chi tiết tài liệu, duyệt hoặc từ chối kèm lý do.
- Tài liệu đã duyệt xuất hiện trong Library.
- Library hỗ trợ danh sách, chi tiết, tìm kiếm/lọc theo metadata.
- Admin có thể lưu trữ tài liệu đã công bố.

**Quản lý giảng viên của Admin**

Backend đã hoàn thành bộ API quản lý tài khoản Teacher: xem danh sách có tìm kiếm/lọc/phân trang,
tạo đơn lẻ hoặc hàng loạt, cập nhật thông tin, kích hoạt/vô hiệu hóa và reset mật khẩu. Tạo tài
khoản sinh mật khẩu tạm và gửi email bất đồng bộ sau commit. API reset hiện chưa nối email bàn giao
mật khẩu mới và trả `emailSent=false`.

**Giao diện non-AI**

- Frontend đã có đăng nhập, khôi phục phiên và bảo vệ route theo vai trò.
- Có màn thư viện, chi tiết tài liệu, tài liệu cá nhân, tải lên và duyệt tài liệu.
- Có UX xác nhận cho một số thao tác quan trọng như xóa hội thoại/đăng xuất.
- Theo kiểm thử thủ công, các tài khoản Teacher hoạt động ổn định; tải lại trang vẫn giữ được trạng thái hội thoại khi dùng chức năng RAG.

### 3.2. Nhóm chức năng có AI

Đây là các chức năng cần AI Service, embedding, pgvector hoặc LLM để hoạt động.

**Phân tích tài liệu sau upload**

- AI Service kiểm tra file, đọc PDF/TXT, làm sạch nội dung và ước tính khả năng xử lý RAG.
- Backend lưu lại các thông tin như khả năng RAG, số trang, số token/chunk ước tính và lỗi nếu có.
- Bước này giúp giảng viên/Admin biết tài liệu có đủ điều kiện để hỏi đáp bằng AI hay không.

**Lập chỉ mục RAG sau khi Admin duyệt**

- AI Service đọc nội dung tài liệu đã duyệt.
- Nội dung được làm sạch và chia thành các đoạn nhỏ theo token.
- AI tạo embedding bằng OpenAI và lưu các đoạn/vector vào PostgreSQL có pgvector.
- Quá trình ghi chunks được thiết kế theo hướng thay thế an toàn, tránh mất dữ liệu cũ nếu index lỗi giữa chừng.

**Hỏi đáp AI theo tài liệu**

- Backend kiểm tra quyền, trạng thái công bố và trạng thái xử lý trước khi gọi AI.
- AI tìm các đoạn liên quan theo document IDs đã được Backend kiểm quyền.
- Retrieval hiện kết hợp tìm kiếm vector và hỗ trợ từ khóa/ngữ cảnh để cải thiện khả năng tìm đúng đoạn.
- Nếu có ngữ cảnh phù hợp, AI sinh câu trả lời tự nhiên bằng LLM nhưng vẫn bám vào các đoạn đã tìm được.
- Câu trả lời có citations lấy từ chunk thật, không tạo nguồn giả.
- Nếu không có thông tin phù hợp trong tài liệu, hệ thống trả trạng thái not-found và không nên hiển thị nguồn trích dẫn gây hiểu nhầm.

**Lịch sử hỏi đáp và câu hỏi nối tiếp**

- Backend lưu hội thoại theo từng user và từng document.
- Khi người dùng mở lại trang, Frontend tải lại lịch sử hội thoại.
- Khi gửi câu hỏi mới, Backend gửi một số lượt gần nhất sang AI để hỗ trợ ngữ cảnh.
- AI Service vẫn stateless, tức không tự lưu conversation trong database.

**Sinh và quản lý quiz từ tài liệu**

- AI Service sinh quiz draft `single_choice` từ chunks thật của document đã index, kèm đáp án,
  giải thích và citations.
- Backend kiểm tra document `PUBLISHED + PROCESSED`, gọi AI, validate response và lưu
  `quizzes`/`quiz_questions`.
- Backend đã có API dành cho Teacher để sinh, lấy danh sách quiz từ database, xem, sửa draft,
  xóa draft và publish quiz; xem/sửa/xóa/publish yêu cầu đúng owner, còn sửa/xóa/publish chỉ áp dụng
  khi trạng thái là `DRAFT`.
- Backend đã có API public để lấy quiz đã công bố, phục vụ đường dẫn gửi cho sinh viên.
- Bộ unit test Backend cho service/request validation đã được bổ sung; toàn bộ 53 test Backend pass.

**Giao diện AI/RAG**

- Frontend có khung hỏi đáp AI trong trang chi tiết tài liệu.
- UI hiển thị câu hỏi, câu trả lời, trạng thái loading/error/not-found, nguồn trích dẫn và lịch sử hội thoại.
- Đã có scroll trong vùng chat, xác nhận xóa lịch sử và cách hiển thị citations gọn hơn.
- Frontend có màn quản lý quiz, popup sinh quiz, editor review/chỉnh sửa, thao tác công bố, lấy link chia sẻ,
  danh sách quiz lấy từ Backend và trang public để sinh viên làm quiz/xem kết quả.

Chất lượng trả lời AI vẫn phụ thuộc vào file có text layer đọc được, tài liệu đã được index đúng, cấu hình OpenAI hợp lệ và retrieval tìm được đoạn thật sự liên quan.

## 4. Luồng hệ thống hiện đã thực hiện được

### 4.1. Luồng non-AI

Luồng non-AI hiện có thể chạy như sau:

Giảng viên đăng nhập -> tải PDF/TXT kèm metadata -> xem tài liệu trong danh sách cá nhân -> chỉnh sửa/gửi duyệt -> Admin đăng nhập -> Admin xem hàng chờ duyệt -> duyệt hoặc từ chối -> tài liệu được công bố xuất hiện trong Library -> người dùng xem chi tiết, xem nội dung hoặc tải file theo quyền.

Ngoài ra, Backend đã có API để Admin tìm kiếm, tạo, cập nhật, kích hoạt/vô hiệu hóa và reset mật khẩu tài khoản Teacher.

### 4.2. Luồng có AI

Luồng AI hiện có thể chạy như sau:

Giảng viên upload tài liệu -> Backend gọi AI phân tích -> Admin duyệt tài liệu -> Backend gọi AI lập chỉ mục -> AI lưu chunks/vector -> người dùng mở tài liệu đã `PUBLISHED + PROCESSED` -> hệ thống tạo/mở conversation -> người dùng hỏi AI -> AI retrieval + generation -> trả câu trả lời kèm citations -> người dùng reload trang và tiếp tục hỏi với lịch sử cũ.

Với quiz, Teacher có thể gửi yêu cầu sinh từ document `PUBLISHED + PROCESSED` -> Backend gọi AI
sinh draft -> lưu quiz/câu hỏi -> owner xem/chỉnh sửa/xáo trộn đáp án nếu cần -> publish quiz ->
hệ thống tạo link public -> sinh viên mở link, làm bài, nộp bài và xem kết quả cuối trang.

Các module chính trong luồng đã được nối trong code. Nhóm đã kiểm thử thủ công việc Teacher reload trang và tiếp tục hội thoại ổn.

## 5. Các phần chưa hoàn thiện

Các luồng chính của MVP đã được nối ở mức sử dụng được: quản lý tài liệu, kiểm duyệt, thư viện,
RAG có lịch sử và quiz public. Những phần còn lại không chặn MVP hiện tại, chủ yếu là hướng nâng cấp:

- Lưu lượt làm quiz, điểm số và xếp hạng vào database nếu muốn quản lý kết quả học tập lâu dài.
- Tách riêng DTO public/submit quiz để ẩn đáp án đúng trước khi nộp và chấm điểm ở Backend, thay vì chấm ngay trên Frontend như MVP hiện tại.
- Chuẩn hóa thêm bộ dữ liệu demo, test end-to-end cuối và các ảnh/sơ đồ trong báo cáo.
- Nếu tiếp tục giữ màn hồ sơ người dùng, Frontend và Backend cần khớp lại các API cập nhật thông tin/đổi mật khẩu. Phần này không phải trọng tâm của MVP tài liệu và RAG.

## 6. Kế hoạch thực hiện tiếp theo

Kế hoạch tiếp theo nên tập trung vào đóng gói MVP và chuẩn bị báo cáo/demo:

1. Chạy smoke test tích hợp Backend -> AI -> PostgreSQL -> Frontend với một document thật đã index.
2. Kiểm thử lại luồng quiz: Teacher sinh/review/publish -> copy link -> mở ở trình duyệt khác -> làm bài -> xem kết quả.
3. Cập nhật sơ đồ use case, activity, sequence, ERD và ảnh giao diện để phản ánh đầy đủ quiz public và quản lý giảng viên.
4. Nếu mở rộng sau MVP, bổ sung lưu attempt/result/xếp hạng và chấm điểm phía Backend.

Sau khi cập nhật tài liệu và sơ đồ, nhóm chỉ cần chạy lại một kịch bản demo cuối từ upload tài liệu ->
duyệt -> hỏi đáp AI -> resume hội thoại -> sinh/publish quiz -> sinh viên làm quiz để xác nhận toàn bộ MVP.

## 7. Kết luận

Dự án đã hoàn thiện nền tảng MVP theo phạm vi document-centric. Nhóm chức năng non-AI đã bao phủ phần xác thực/phân quyền,
quản lý tài liệu, kiểm duyệt, thư viện, tải/xem file, hồ sơ cá nhân và API Admin quản lý tài khoản
Teacher. Nhóm chức năng AI đã bao phủ phân tích tài liệu, lập chỉ mục RAG, hỏi đáp có trích dẫn,
resume lịch sử hội thoại và sinh quiz từ tài liệu; Backend/Frontend đã nối luồng Teacher review,
publish, lấy link public và cho người học làm quiz trên trang riêng.

Phần còn lại nên trình bày như hướng nâng cấp sau MVP là lưu attempt/result/xếp hạng và chấm điểm phía
server. Ở trạng thái hiện tại, hệ thống đủ cơ sở để trình bày như một MVP thư viện học liệu có hỗ trợ AI,
RAG và quiz ôn tập qua link công khai.
