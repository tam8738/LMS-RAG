# PRD v1.1 — Hệ thống quản lý học liệu, hỗ trợ học tập và sinh câu hỏi ôn tập sử dụng RAG cho ngành CNTT

## 1. Tổng quan dự án

### 1.1. Tên đề tài

**Xây dựng hệ thống quản lý học liệu, hỗ trợ học tập và sinh câu hỏi ôn tập sử dụng RAG cho ngành CNTT**

Tên đề tài có thể được điều chỉnh theo yêu cầu của giảng viên hướng dẫn. Trong phạm vi PRD này, hệ thống được hiểu là một nền tảng web hỗ trợ giảng viên quản lý học liệu giảng dạy và hỗ trợ sinh viên học tập thông qua RAG, tóm tắt bài giảng và quiz/câu hỏi ôn tập.

### 1.2. Mục tiêu sản phẩm

Xây dựng một hệ thống web hỗ trợ Teacher/Admin quản lý học liệu giảng dạy và hỗ trợ Student học tập dựa trên nội dung học liệu đã được xử lý.

Các mục tiêu chính:

- Quản lý course/lớp học.
- Quản lý lecture/bài giảng.
- Quản lý học liệu giảng dạy như tài liệu bài giảng, slide đã xuất PDF, đề cương môn học và tài liệu tham khảo.
- Cho phép Teacher/Admin upload, CRUD và chia sẻ học liệu nội bộ cho Teacher/Admin khác xem.
- Xử lý học liệu để phục vụ RAG, tóm tắt và sinh câu hỏi ôn tập.
- Cho phép Student hỏi đáp theo nội dung lecture bằng RAG.
- Sinh summary bài giảng để Teacher/Admin kiểm duyệt và công bố.
- Sinh câu hỏi ôn tập/quiz theo lecture, chương hoặc phần nội dung.
- Cho phép Student làm quiz và xem kết quả học tập.

Hệ thống sử dụng **Retrieval-Augmented Generation (RAG)** để truy xuất các đoạn nội dung liên quan trong học liệu trước khi sinh câu trả lời. Mục tiêu là giúp câu trả lời bám sát học liệu, có nguồn trích dẫn để kiểm chứng và hỗ trợ sinh viên tự học hiệu quả hơn.

### 1.3. Định hướng MVP

MVP tập trung vào các chức năng cốt lõi để có thể demo hoàn chỉnh luồng sử dụng của Teacher/Admin và Student.

Các cụm chức năng chính:

1. Teacher/Admin quản lý course, lecture và học liệu giảng dạy.
2. AI xử lý học liệu: parse, clean, chunk, embedding.
3. Student hỏi đáp RAG với lecture, có citation.
4. Teacher/Admin sinh, chỉnh sửa và công bố summary/câu hỏi ôn tập/quiz.
5. Student xem summary, làm quiz ôn tập và xem kết quả.

MVP ưu tiên đơn giản, dễ triển khai, dễ demo. Các chi tiết như API cụ thể, data model chi tiết, tối ưu kiến trúc và triển khai nâng cao sẽ được thống nhất trong quá trình thiết kế kỹ thuật.

OCR và các dạng câu hỏi tương tác nâng cao như drag-and-drop, sắp xếp thứ tự hoặc matching được xem là chức năng mở rộng, không bắt buộc trong MVP.

---

## 2. Người dùng và vai trò

### 2.1. Teacher/Admin

Teacher/Admin là người quản lý lớp học, bài giảng, học liệu giảng dạy và các nội dung học tập trong hệ thống.

Teacher/Admin có thể:

- Đăng ký và đăng nhập.
- Tạo và quản lý course/lớp học.
- Tạo và quản lý lecture/bài giảng.
- Upload học liệu giảng dạy như tài liệu bài giảng, slide đã xuất PDF, đề cương môn học và tài liệu tham khảo.
- CRUD học liệu do mình upload hoặc học liệu được cấp quyền quản lý.
- Chia sẻ học liệu cho Teacher/Admin khác xem nếu học liệu được đánh dấu chia sẻ nội bộ.
- Yêu cầu hệ thống xử lý học liệu.
- Yêu cầu AI sinh summary theo lecture, chương hoặc phần nội dung.
- Xem, chỉnh sửa và công bố summary.
- Yêu cầu AI sinh câu hỏi ôn tập/quiz theo lecture, chương hoặc phần nội dung.
- Chỉnh sửa câu hỏi, đáp án, đáp án mẫu, điểm số và phần giải thích trước khi công bố.
- Công bố hoặc hủy công bố quiz.
- Theo dõi một số thống kê học tập cơ bản nếu kịp triển khai.

### 2.2. Student

Student là người học sử dụng hệ thống để truy cập nội dung đã được công bố.

Student có thể:

- Đăng ký và đăng nhập.
- Tham gia course bằng mã lớp.
- Xem danh sách course đã tham gia.
- Xem danh sách lecture trong course.
- Xem summary đã được công bố.
- Đặt câu hỏi với nội dung lecture.
- Xem câu trả lời và nguồn trích dẫn.
- Làm quiz đã được công bố.
- Trả lời các dạng câu hỏi cơ bản trong MVP: single choice, multiple choice và short answer.
- Xem điểm, đáp án đúng, đáp án mẫu và giải thích sau khi làm quiz.

### 2.3. External AI Provider

External AI Provider là dịch vụ AI bên ngoài được hệ thống tích hợp để thực hiện các tác vụ như sinh embedding, sinh câu trả lời, sinh summary và sinh câu hỏi ôn tập/quiz.

Trong MVP, có thể sử dụng OpenAI API hoặc một nhà cung cấp AI tương đương tùy theo khả năng triển khai của nhóm.

---

## 3. Thành phần hệ thống ở mức tổng quan

### 3.1. Frontend Web App

Frontend là giao diện web cho Teacher/Admin và Student sử dụng.

Nhiệm vụ chính:

- Hiển thị giao diện đăng nhập/đăng ký.
- Hiển thị giao diện cho Teacher/Admin quản lý course, lecture, học liệu, summary và quiz/câu hỏi ôn tập.
- Hiển thị giao diện cho Student học tập theo course và lecture.
- Hiển thị giao diện hỏi đáp RAG với lecture.
- Hiển thị giao diện làm quiz, nộp bài và xem kết quả.
- Hiển thị trạng thái xử lý học liệu và các lỗi phát sinh.

### 3.2. Backend Service

Backend là thành phần xử lý nghiệp vụ chính của hệ thống.

Nhiệm vụ chính:

- Xác thực và phân quyền người dùng.
- Quản lý dữ liệu course, lecture, learning material/document, summary, quiz/question và quiz attempt.
- Kiểm tra quyền truy cập của Teacher/Admin và Student.
- Kiểm soát quyền học liệu riêng tư/chia sẻ nội bộ.
- Nhận request từ frontend.
- Gọi AI Service khi cần xử lý các chức năng AI.
- Lưu kết quả vào database.

### 3.3. AI Service

AI Service là thành phần nội bộ chuyên xử lý các tác vụ AI.

Nhiệm vụ chính:

- Xử lý học liệu PDF/TXT.
- Trích xuất và làm sạch nội dung.
- Chia học liệu thành các đoạn nhỏ.
- Sinh embedding.
- Truy xuất nội dung liên quan.
- Sinh câu trả lời RAG.
- Sinh summary.
- Sinh câu hỏi ôn tập/quiz có cấu trúc.

AI Service không xử lý phân quyền người dùng. Việc xác thực và phân quyền do Backend Service thực hiện trước khi gọi AI Service.

### 3.4. Database và Vector Storage

Database dùng để lưu dữ liệu nghiệp vụ và dữ liệu phục vụ AI.

Dữ liệu cần lưu ở mức tổng quan:

- Người dùng.
- Course.
- Lecture.
- Học liệu/document.
- Metadata học liệu.
- Summary.
- Quiz.
- Question.
- Quiz attempt/kết quả làm bài.
- Lịch sử hỏi đáp.
- Nội dung đã chunk.
- Vector embedding.

---

## 4. Công nghệ dự kiến

| Thành phần | Công nghệ dự kiến |
|---|---|
| Frontend | React + Vite |
| Backend | Java Spring Boot |
| AI Service | Python + FastAPI |
| Database | PostgreSQL |
| Vector Search | pgvector |
| Authentication | Spring Security + JWT |
| File Storage | Local storage trong MVP |
| AI Provider | OpenAI API hoặc provider tương đương |
| API Style | REST API |
| Deployment MVP | Local hoặc Docker Compose nếu kịp |

Ghi chú:

- Frontend chỉ gọi Backend Service.
- Backend Service điều phối nghiệp vụ, kiểm tra quyền và gọi AI Service khi cần.
- AI Service xử lý học liệu và các tác vụ AI.
- Không bắt buộc queue, cloud storage, CI/CD hoặc hệ thống triển khai phức tạp trong MVP.
- API chi tiết và data model chi tiết sẽ được thống nhất trong giai đoạn thiết kế kỹ thuật.

---

## 5. Phạm vi chức năng MVP

### 5.1. Trong phạm vi MVP

MVP cần hoàn thiện các nhóm chức năng sau:

- Quản lý người dùng và phân quyền.
- Quản lý course/lớp học.
- Quản lý lecture/bài giảng.
- Upload và quản lý học liệu giảng dạy.
- CRUD học liệu do Teacher/Admin upload.
- Chia sẻ học liệu nội bộ ở mức Teacher/Admin khác có thể xem.
- Xử lý học liệu PDF/TXT có thể trích xuất văn bản.
- Hỏi đáp với bài giảng bằng RAG.
- Sinh summary bài giảng.
- Teacher/Admin chỉnh sửa và công bố summary.
- Sinh câu hỏi ôn tập/quiz theo lecture, chương hoặc phần nội dung.
- Hỗ trợ câu hỏi cơ bản: single choice, multiple choice và short answer.
- Teacher/Admin chỉnh sửa và công bố quiz.
- Student làm quiz và xem kết quả.
- Chấm điểm tự động cho câu hỏi single choice và multiple choice.
- Với short answer, MVP hiển thị đáp án mẫu và giải thích sau khi Student nộp bài.
- Lưu lịch sử hỏi đáp ở mức cơ bản nếu kịp.
- Dashboard/thống kê cơ bản nếu còn thời gian.

### 5.2. Ngoài phạm vi MVP

Các chức năng sau không bắt buộc trong MVP:

- System Admin riêng.
- Multi-school SaaS.
- Nhiều Teacher/Admin cùng quản lý một course ở mức cộng tác đầy đủ.
- Chỉnh sửa/xóa học liệu của Teacher/Admin khác nếu chưa được cấp quyền.
- Student upload tài liệu cá nhân.
- Hỏi đáp toàn bộ course hoặc multi-course RAG.
- OCR cho tài liệu scan, ảnh hoặc slide dạng ảnh.
- Xử lý trực tiếp PPTX/DOCX nâng cao.
- Câu hỏi tương tác nâng cao như drag-and-drop, sắp xếp thứ tự, matching.
- Chấm tự động short answer bằng AI/rubric.
- Adaptive learning.
- Phát hiện điểm yếu học tập nâng cao.
- Export PDF/Word.
- Mobile app.
- Cloud storage bắt buộc.
- CI/CD bắt buộc.
- Reset password qua email.
- Audit log đầy đủ.

---

## 6. Chức năng cơ bản

### 6.1. Quản lý người dùng và phân quyền

- Người dùng có thể đăng ký, đăng nhập và đăng xuất.
- Hệ thống hỗ trợ hai vai trò chính: Teacher/Admin và Student.
- Teacher/Admin quản lý course do mình tạo hoặc được cấp quyền quản lý.
- Teacher/Admin quản lý học liệu do mình upload hoặc học liệu được cấp quyền quản lý.
- Teacher/Admin khác có thể xem học liệu được chia sẻ nội bộ.
- Chỉ chủ sở hữu học liệu hoặc người được cấp quyền mới được chỉnh sửa/xóa học liệu.
- Student chỉ truy cập được course đã tham gia.
- Student chỉ xem được nội dung học tập đã được công bố trong course đã tham gia.
- Student không xem được summary hoặc quiz chưa được công bố.
- Backend cần kiểm tra quyền truy cập trước khi thực hiện các thao tác quan trọng.

### 6.2. Quản lý course/lớp học

- Teacher/Admin có thể tạo course.
- Teacher/Admin có thể xem và cập nhật thông tin course do mình quản lý.
- Mỗi course có mã lớp để Student tham gia.
- Student có thể tham gia course bằng mã lớp.
- Student có thể xem danh sách course đã tham gia.

### 6.3. Quản lý lecture/bài giảng

- Teacher/Admin có thể tạo lecture trong course.
- Teacher/Admin có thể xem và cập nhật thông tin lecture.
- Student có thể xem danh sách lecture trong course đã tham gia.
- Lecture là đơn vị chính để gắn học liệu, summary, quiz và chức năng hỏi đáp.
- Trong MVP, RAG ưu tiên theo lecture; sinh summary/câu hỏi có thể theo lecture, chương hoặc phần nội dung nếu học liệu được tổ chức phù hợp.

### 6.4. Quản lý học liệu giảng dạy

- Teacher/Admin có thể upload học liệu cho từng lecture hoặc course.
- Học liệu có thể bao gồm tài liệu bài giảng, slide đã xuất PDF, đề cương môn học và tài liệu tham khảo.
- MVP hỗ trợ PDF/TXT có thể trích xuất văn bản.
- Đối với slide bài giảng hoặc đề cương ở định dạng khác, giảng viên có thể xuất sang PDF trước khi upload.
- Hệ thống cần kiểm tra định dạng và dung lượng file.
- Hệ thống lưu file học liệu và metadata liên quan.
- Teacher/Admin có thể thêm, xem, cập nhật thông tin và xóa học liệu do mình upload hoặc học liệu được cấp quyền quản lý.
- Teacher/Admin có thể đánh dấu học liệu ở chế độ chia sẻ nội bộ để Teacher/Admin khác xem và tham khảo.
- Hệ thống hiển thị trạng thái xử lý học liệu.
- Chỉ học liệu có trạng thái Processed mới được dùng cho RAG, summary và sinh câu hỏi ôn tập/quiz.

Trạng thái học liệu dự kiến:

- Uploaded.
- Processing.
- Processed.
- Failed.

### 6.5. Quản lý summary

- Teacher/Admin có thể yêu cầu AI sinh summary từ học liệu đã xử lý.
- Summary có thể được sinh theo lecture, chương hoặc phần nội dung.
- Summary sau khi sinh ra ở trạng thái nháp.
- Teacher/Admin có thể chỉnh sửa summary.
- Teacher/Admin có thể công bố hoặc hủy công bố summary.
- Student chỉ xem được summary đã được công bố.

### 6.6. Quản lý câu hỏi ôn tập/quiz

- Teacher/Admin có thể yêu cầu AI sinh câu hỏi ôn tập/quiz từ học liệu đã xử lý.
- Teacher/Admin có thể chọn phạm vi sinh câu hỏi theo lecture, chương hoặc phần nội dung.
- Teacher/Admin có thể cấu hình số lượng câu hỏi, loại câu hỏi và phạm vi nội dung ở mức cơ bản.
- Quiz/câu hỏi sau khi sinh ra ở trạng thái nháp.
- Teacher/Admin có thể chỉnh sửa tiêu đề, mô tả, thời gian làm bài nếu có.
- Teacher/Admin có thể thêm, sửa hoặc xóa câu hỏi trong quiz.
- Teacher/Admin có thể chỉnh sửa nội dung câu hỏi, loại câu hỏi, đáp án đúng, đáp án mẫu, điểm số và giải thích.
- Teacher/Admin có thể xóa câu hỏi không phù hợp.
- Teacher/Admin có thể công bố hoặc hủy công bố quiz.
- Student chỉ làm được quiz đã được công bố.

Hệ thống thiết kế quiz theo hướng mở rộng nhiều loại câu hỏi, gồm:

- Single choice.
- Multiple choice.
- Short answer.
- Drag-and-drop.
- Sắp xếp thứ tự.
- Matching.

Trong MVP, hệ thống ưu tiên triển khai single choice, multiple choice và short answer. Drag-and-drop, sắp xếp thứ tự và matching là chức năng mở rộng.

### 6.7. Student làm quiz và xem kết quả

- Student có thể mở quiz đã được công bố.
- Student có thể trả lời câu hỏi theo loại câu hỏi tương ứng.
- Student có thể chọn một đáp án với single choice.
- Student có thể chọn nhiều đáp án với multiple choice.
- Student có thể nhập câu trả lời ngắn với short answer.
- Student có thể nộp bài.
- Hệ thống tự động chấm điểm câu hỏi single choice và multiple choice.
- Hệ thống lưu kết quả làm bài, câu trả lời, điểm số, thời gian nộp bài và trạng thái hoàn thành.
- Student có thể xem điểm sau khi nộp bài.
- Student có thể xem đáp án đúng, đáp án mẫu và giải thích sau khi nộp bài.
- Với short answer, MVP hiển thị đáp án mẫu và giải thích, chưa bắt buộc chấm tự động bằng AI.

### 6.8. Lưu lịch sử hỏi đáp

- Hệ thống lưu câu hỏi của Student.
- Hệ thống lưu câu trả lời của AI.
- Hệ thống lưu thông tin nguồn trích dẫn.
- Student có thể xem lại lịch sử hỏi đáp nếu kịp triển khai.
- Teacher/Admin xem thống kê/câu hỏi phổ biến có thể để P1.

### 6.9. Dashboard/thống kê cơ bản

Nếu còn thời gian, hệ thống có thể hỗ trợ một số thống kê cơ bản:

- Số lượng Student trong course.
- Số lượng lecture.
- Số lượng học liệu/document.
- Số lượng quiz/câu hỏi ôn tập.
- Điểm quiz trung bình.
- Lecture được hỏi nhiều.
- Câu hỏi được hỏi nhiều.

Dashboard nâng cao không bắt buộc trong MVP.

---

## 7. Chức năng AI

### 7.1. Xử lý học liệu

Sau khi Teacher/Admin upload học liệu và yêu cầu xử lý, AI Service thực hiện pipeline xử lý học liệu.

Các bước chính:

- Trích xuất nội dung từ PDF/TXT.
- Làm sạch và chuẩn hóa văn bản.
- Chia nội dung thành các đoạn nhỏ.
- Gắn metadata cơ bản cho từng đoạn như document_id, course_id, lecture_id, page_number và chunk_index nếu có.
- Sinh embedding.
- Lưu dữ liệu để phục vụ truy xuất RAG, sinh summary và sinh câu hỏi ôn tập.

Trong MVP, không bắt buộc OCR hoặc parser nâng cao cho tài liệu scan, ảnh, PPTX/DOCX trực tiếp.

### 7.2. Hỏi đáp với bài giảng bằng RAG

Student có thể đặt câu hỏi theo từng lecture.

Luồng tổng quát:

- Student nhập câu hỏi.
- Backend kiểm tra quyền truy cập.
- AI Service tìm các đoạn nội dung liên quan trong lecture.
- AI Service sinh câu trả lời dựa trên nội dung truy xuất được.
- Hệ thống hiển thị câu trả lời kèm nguồn trích dẫn.

Nguyên tắc:

- Câu trả lời phải bám sát học liệu/bài giảng.
- Nếu không có thông tin phù hợp trong học liệu, hệ thống cần thông báo rằng không tìm thấy thông tin trong bài giảng đã cung cấp.
- Câu trả lời nên có citation để Student kiểm chứng.

### 7.3. Sinh summary bài giảng

AI Service sinh summary từ nội dung học liệu đã xử lý.

Summary có thể gồm:

- Tóm tắt toàn bài.
- Tóm tắt theo hướng ôn tập.
- Tóm tắt theo chương/phần nội dung nếu học liệu có cấu trúc phù hợp.

Summary cần bám sát nội dung học liệu và không tự thêm kiến thức ngoài. Summary sinh ra cần được Teacher/Admin duyệt trước khi công bố.

### 7.4. Sinh câu hỏi ôn tập/quiz

AI Service sinh câu hỏi ôn tập từ học liệu đã xử lý.

Phạm vi sinh câu hỏi có thể theo:

- Lecture.
- Chương.
- Phần nội dung cụ thể.

Trong MVP, AI Service ưu tiên sinh các loại câu hỏi cơ bản:

- Single choice.
- Multiple choice.
- Short answer.

Mỗi câu hỏi nên có:

- Loại câu hỏi.
- Nội dung câu hỏi.
- Danh sách lựa chọn nếu có.
- Đáp án đúng nếu là câu hỏi lựa chọn.
- Đáp án mẫu hoặc gợi ý trả lời nếu là short answer.
- Điểm số dự kiến.
- Giải thích.
- Metadata nguồn tham chiếu nếu có, ví dụ document_id, page_number hoặc chunk_id.

AI Service cần trả kết quả dạng có cấu trúc để Backend lưu vào database. Quiz/câu hỏi sinh ra cần được Teacher/Admin duyệt trước khi công bố.

Các dạng câu hỏi nâng cao như drag-and-drop, sắp xếp thứ tự và matching không bắt buộc triển khai trong MVP.

### 7.5. Kiểm soát nội dung AI

Để hạn chế nội dung AI sai lệch:

- RAG cần truy xuất nội dung từ học liệu trước khi sinh câu trả lời.
- Câu trả lời nên có nguồn trích dẫn.
- Nếu thiếu thông tin trong học liệu, hệ thống không nên tự suy diễn.
- Summary và quiz/câu hỏi do AI sinh ra không được tự động công bố.
- Teacher/Admin cần kiểm duyệt nội dung AI sinh ra trước khi Student sử dụng.
- Câu hỏi ôn tập cần bám nội dung học liệu, tránh tạo câu hỏi ngoài phạm vi tài liệu nguồn.

---

## 8. Luồng sử dụng chính

### 8.1. Luồng Teacher/Admin

- Teacher/Admin đăng nhập.
- Tạo course.
- Tạo lecture trong course.
- Upload học liệu giảng dạy.
- Cập nhật/xóa học liệu nếu cần.
- Đánh dấu học liệu chia sẻ nội bộ nếu muốn Teacher/Admin khác xem.
- Yêu cầu hệ thống xử lý học liệu.
- Yêu cầu AI sinh summary.
- Kiểm tra, chỉnh sửa và công bố summary.
- Yêu cầu AI sinh câu hỏi ôn tập/quiz theo lecture, chương hoặc phần nội dung.
- Kiểm tra, chỉnh sửa câu hỏi, đáp án, giải thích và công bố quiz.

### 8.2. Luồng Student

- Student đăng nhập.
- Tham gia course bằng mã lớp.
- Xem danh sách lecture.
- Mở lecture.
- Xem summary đã công bố.
- Đặt câu hỏi với bài giảng.
- Xem câu trả lời và nguồn trích dẫn.
- Làm quiz đã công bố.
- Trả lời single choice, multiple choice hoặc short answer.
- Nộp bài.
- Xem điểm, đáp án đúng/đáp án mẫu và giải thích.

### 8.3. Luồng AI xử lý học liệu

- Nhận thông tin học liệu cần xử lý.
- Trích xuất nội dung học liệu.
- Làm sạch văn bản.
- Chia nội dung thành các đoạn nhỏ.
- Gắn metadata.
- Sinh embedding.
- Lưu dữ liệu phục vụ truy xuất, summary và sinh câu hỏi.

### 8.4. Luồng RAG Q&A

- Nhận câu hỏi của Student.
- Truy xuất nội dung liên quan từ học liệu trong lecture.
- Sinh câu trả lời dựa trên nội dung truy xuất.
- Trả về câu trả lời và citation.
- Lưu lịch sử hỏi đáp.

### 8.5. Luồng sinh câu hỏi ôn tập/quiz

- Teacher/Admin chọn lecture/chương/phần nội dung.
- Teacher/Admin chọn số lượng câu hỏi và loại câu hỏi nếu hệ thống hỗ trợ.
- Backend kiểm tra quyền và gửi yêu cầu sang AI Service.
- AI Service truy xuất/ngữ cảnh hóa nội dung học liệu liên quan.
- AI Service sinh câu hỏi, đáp án, đáp án mẫu, giải thích và metadata nguồn nếu có.
- Backend lưu kết quả ở trạng thái draft.
- Teacher/Admin kiểm duyệt, chỉnh sửa và công bố.
- Student chỉ nhìn thấy quiz sau khi được công bố.

---

## 9. Yêu cầu phi chức năng

### 9.1. Bảo mật

- Hệ thống cần xác thực người dùng.
- Mật khẩu phải được lưu an toàn.
- Backend kiểm tra quyền truy cập theo vai trò.
- Student không xem được nội dung chưa công bố.
- Student không truy cập được course chưa tham gia.
- Teacher/Admin chỉ quản lý course/học liệu trong phạm vi được cấp quyền.
- Teacher/Admin khác chỉ xem được học liệu được chia sẻ nội bộ, không mặc định được sửa/xóa.

### 9.2. Hiệu năng

- MVP phục vụ mục tiêu demo với số lượng người dùng nhỏ.
- Chức năng RAG Q&A nên phản hồi trong thời gian chấp nhận được cho demo.
- File upload giới hạn dung lượng để tránh xử lý quá nặng.
- Các tác vụ AI có thể mất thời gian, cần có trạng thái xử lý rõ ràng.

### 9.3. Độ tin cậy

- Học liệu cần có trạng thái xử lý rõ ràng.
- Khi xử lý lỗi, hệ thống cần hiển thị thông báo phù hợp.
- Nếu AI Service lỗi, không làm mất dữ liệu đã có.
- Nội dung AI sinh ra nên được lưu nháp trước khi công bố.

### 9.4. Khả năng mở rộng

Kiến trúc cần để mở khả năng phát triển sau này như:

- Hỗ trợ nhiều loại học liệu hơn.
- OCR tài liệu scan/ảnh.
- Xử lý trực tiếp PPTX/DOCX.
- Hỏi đáp trên nhiều tài liệu hoặc toàn course.
- Câu hỏi tương tác nâng cao: drag-and-drop, sắp xếp thứ tự, matching.
- Chấm tự động short answer bằng AI/rubric.
- Dashboard học tập nâng cao.
- Cloud storage.
- Tối ưu hiệu năng RAG.

### 9.5. Kiểm soát chi phí AI

- Không tự động gọi AI ngay khi upload nếu không cần.
- Teacher/Admin chủ động bấm xử lý/generate.
- Summary và quiz/câu hỏi sau khi sinh cần được lưu lại để tránh gọi AI lặp lại không cần thiết.
- Chỉ học liệu đã xử lý thành công mới được dùng cho RAG, summary và sinh câu hỏi.

---

## 10. Phân chia công việc

| Người làm | Nhóm công việc | Công việc cần làm | Kết quả cần đạt |
|---|---|---|---|
| Backend Developer | Khởi tạo backend | Khởi tạo Spring Boot project, cấu hình PostgreSQL/pgvector, Swagger, cấu trúc module backend | Backend chạy được, kết nối database được |
| Backend Developer | Xác thực và phân quyền | Xây dựng đăng ký/đăng nhập, JWT, phân quyền Teacher/Admin và Student; kiểm soát quyền course, lecture, học liệu riêng tư/chia sẻ nội bộ và nội dung đã publish | Người dùng đăng nhập được, hệ thống phân quyền đúng theo role và phạm vi dữ liệu |
| Backend Developer | Course/Lecture | Xây dựng API tạo, xem, sửa course và lecture; sinh course code; xử lý Student join course | Teacher quản lý lớp/bài giảng được, Student tham gia lớp được |
| Backend Developer | Quản lý học liệu | Xây dựng API upload PDF/TXT, validate file, lưu file local, CRUD học liệu, quản lý trạng thái xử lý, lưu metadata học liệu, hỗ trợ đánh dấu chia sẻ nội bộ | Teacher upload, quản lý, theo dõi trạng thái và chia sẻ học liệu nội bộ được |
| Backend Developer | AI integration | Gọi Python FastAPI để xử lý học liệu, sinh summary, sinh câu hỏi ôn tập/quiz và trả lời RAG | Backend kết nối được với AI Service |
| Backend Developer | Summary workflow | Lưu summary draft, hỗ trợ chỉnh sửa, publish/unpublish, cung cấp API cho Student xem summary | Teacher duyệt summary được, Student xem summary được |
| Backend Developer | RAG chat workflow | Xây dựng API chat, kiểm tra quyền Student, lưu câu hỏi, câu trả lời và citation | Hệ thống lưu được lịch sử hỏi đáp |
| Backend Developer | Quiz/question workflow | Lưu quiz/questions, hỗ trợ single choice, multiple choice, short answer; chỉnh sửa, publish/unpublish quiz; submit quiz; chấm tự động câu hỏi lựa chọn | Student làm quiz, hệ thống chấm điểm câu hỏi lựa chọn và lưu kết quả được |
| Backend Developer | Dashboard/API docs/Test | Làm dashboard cơ bản, hoàn thiện Swagger/API docs, kiểm thử backend và phân quyền | Backend ổn định để demo |
| Frontend Developer | Khởi tạo frontend | Khởi tạo React + Vite, routing, layout, API client | Frontend chạy được và có cấu trúc rõ ràng |
| Frontend Developer | Auth UI | Làm màn đăng ký, đăng nhập, protected route, điều hướng theo role | Người dùng thao tác đăng nhập/đăng ký được |
| Frontend Developer | Teacher UI | Làm giao diện quản lý course, lecture, học liệu; upload PDF/TXT; CRUD học liệu; hiển thị trạng thái xử lý; cấu hình chia sẻ nội bộ | Teacher quản lý khóa học, bài giảng và học liệu qua giao diện được |
| Frontend Developer | Summary UI | Làm giao diện generate, xem, chỉnh sửa, publish summary cho Teacher; màn xem summary cho Student | Summary workflow dùng được trên UI |
| Frontend Developer | Chat UI | Làm giao diện hỏi đáp, hiển thị câu trả lời, citation và lịch sử chat | Student hỏi đáp với bài giảng qua UI được |
| Frontend Developer | Quiz/question UI | Làm giao diện Teacher review/publish quiz; chỉnh sửa câu hỏi, đáp án, giải thích; hỗ trợ Student làm single choice, multiple choice, short answer và xem kết quả | Quiz workflow dùng được trên UI, Student không thấy đáp án trước khi nộp bài |
| Frontend Developer | Dashboard/UX/Test | Làm dashboard cơ bản, loading/error state, polish giao diện, test UI | Giao diện ổn định để demo |
| AI Engineer | Khởi tạo AI Service | Khởi tạo FastAPI service, cấu hình OpenAI key, kết nối PostgreSQL/pgvector | AI Service chạy được |
| AI Engineer | Xử lý học liệu | Parse PDF/TXT, clean text, chunk học liệu, gắn metadata theo document/course/lecture/page/chunk | Học liệu được chuyển thành chunks có cấu trúc phục vụ RAG, summary và sinh câu hỏi |
| AI Engineer | Embedding/Retrieval | Sinh embedding bằng OpenAI API, lưu vector vào pgvector, truy vấn top-k chunks | Nền tảng retrieval hoạt động |
| AI Engineer | RAG Q&A | Xây dựng endpoint trả lời câu hỏi, retrieve chunks, sinh answer, trả citation, xử lý not-found | AI trả lời dựa trên học liệu và có nguồn |
| AI Engineer | Summary generation | Xây prompt và endpoint sinh full summary, exam-review summary | AI sinh được tóm tắt bài giảng từ học liệu đã xử lý |
| AI Engineer | Question generation | Xây prompt và endpoint sinh câu hỏi theo lecture/chương/phần; hỗ trợ single choice, multiple choice, short answer; sinh đáp án, đáp án mẫu, giải thích và metadata nguồn | AI sinh được bộ câu hỏi ôn tập có cấu trúc từ học liệu |
| AI Engineer | Evaluation/Prompt tuning | Test RAG, summary, sinh câu hỏi với học liệu mẫu; kiểm tra citation, độ bám nguồn, chất lượng câu hỏi; chỉnh prompt; ghi nhận lỗi thường gặp | AI pipeline ổn định hơn và có dữ liệu đánh giá |
| Cả nhóm | Tích hợp hệ thống | Kết nối frontend, backend, AI service và database; test luồng end-to-end | Các module hoạt động cùng nhau |
| Cả nhóm | Demo và báo cáo | Chuẩn bị demo script, screenshot/video, viết báo cáo chức năng, kiến trúc, AI pipeline, quản lý học liệu, sinh câu hỏi và đánh giá | Sẵn sàng demo và nộp báo cáo |

---

## 11. Tiêu chí hoàn thành MVP

MVP được xem là hoàn thành nếu demo được các luồng sau.

### 11.1. Teacher/Admin flow

- Teacher/Admin đăng nhập.
- Tạo course.
- Tạo lecture.
- Upload học liệu.
- CRUD học liệu ở mức cơ bản.
- Đánh dấu học liệu chia sẻ nội bộ nếu cần.
- Xử lý học liệu.
- Sinh summary.
- Chỉnh sửa và công bố summary.
- Sinh câu hỏi ôn tập/quiz theo lecture/chương/phần.
- Chỉnh sửa câu hỏi, đáp án, giải thích và công bố quiz.

### 11.2. Student flow

- Student đăng nhập.
- Tham gia course bằng mã lớp.
- Mở lecture.
- Xem summary đã công bố.
- Đặt câu hỏi với bài giảng.
- Xem câu trả lời có nguồn trích dẫn.
- Làm quiz đã công bố.
- Trả lời single choice, multiple choice và short answer.
- Nộp bài.
- Xem điểm, đáp án đúng/đáp án mẫu và giải thích.

### 11.3. AI flow

- Học liệu được xử lý thành các đoạn nội dung.
- Dữ liệu được dùng để truy xuất khi hỏi đáp.
- RAG trả lời dựa trên học liệu.
- Câu trả lời có citation.
- AI sinh được summary từ lecture/học liệu.
- AI sinh được câu hỏi ôn tập từ lecture/chương/phần.
- AI trả question output dạng có cấu trúc để Backend lưu.

### 11.4. Permission flow

- Student không xem được summary/quiz chưa công bố.
- Student không truy cập được course chưa tham gia.
- Teacher/Admin chỉ quản lý course trong phạm vi được cấp quyền.
- Teacher/Admin chỉ chỉnh sửa/xóa học liệu do mình upload hoặc được cấp quyền.
- Teacher/Admin khác chỉ xem được học liệu được chia sẻ nội bộ.

---

## 12. Rủi ro và hướng xử lý

| Rủi ro | Hướng xử lý |
|---|---|
| PDF khó parse hoặc bị lỗi | MVP chỉ cam kết PDF/TXT có thể trích xuất văn bản |
| Tài liệu scan/ảnh cần OCR | Ghi OCR là chức năng mở rộng, không bắt buộc MVP |
| Slide/PPTX/DOCX xử lý trực tiếp phức tạp | Giảng viên xuất slide/đề cương sang PDF trước khi upload |
| AI trả lời sai hoặc suy diễn | Dùng RAG, citation, prompt yêu cầu bám học liệu |
| Summary/câu hỏi AI sinh chưa tốt | Teacher/Admin kiểm duyệt trước khi công bố |
| Sinh câu hỏi theo chương/phần khó nếu tài liệu không có cấu trúc | MVP ưu tiên lecture-level; chương/phần dựa vào học liệu có cấu trúc hoặc phạm vi do Teacher/Admin chọn |
| Scope câu hỏi tương tác bị phình | MVP chỉ làm single choice, multiple choice, short answer |
| Short Answer khó chấm | MVP chỉ chấm câu hỏi lựa chọn, short answer hiển thị đáp án mẫu và giải thích |
| Tích hợp Java-Python lỗi | Dùng REST API đơn giản, thống nhất contract sau |
| Nhóm kỹ thuật yếu | Tránh queue, microservice phức tạp, CI/CD bắt buộc |
| AI call tốn chi phí | Chỉ gọi AI khi người dùng chủ động yêu cầu, lưu kết quả sau khi sinh |

---

## 13. Ghi chú cho AI coding agent

Khi triển khai, cần ưu tiên làm theo thứ tự:

1. Khởi tạo frontend, backend, AI service và database.
2. Làm authentication và phân quyền.
3. Làm course, lecture và join course.
4. Làm upload và quản lý học liệu.
5. Làm quyền chia sẻ học liệu nội bộ ở mức xem.
6. Làm xử lý học liệu bằng AI.
7. Làm embedding và retrieval.
8. Làm RAG Q&A.
9. Làm summary generation và workflow duyệt/publish.
10. Làm question/quiz generation và workflow làm quiz.
11. Tích hợp end-to-end.
12. Test, polish và chuẩn bị demo.

Không tự ý thêm các chức năng ngoài MVP như OCR, parser PPTX/DOCX trực tiếp, cloud storage, queue, admin riêng, adaptive learning, drag-and-drop, sắp xếp thứ tự, matching hoặc chấm tự động Short Answer bằng AI nếu chưa được yêu cầu.

Cần giữ rõ ranh giới trách nhiệm:

- Frontend: giao diện và gọi Backend.
- Backend: nghiệp vụ, phân quyền, điều phối, lưu dữ liệu.
- AI Service: xử lý học liệu và các tác vụ AI.
- External AI Provider: cung cấp embedding và generation.
- Database/vector storage: lưu dữ liệu nghiệp vụ và dữ liệu phục vụ RAG.