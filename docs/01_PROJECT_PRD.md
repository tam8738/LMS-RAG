# PRD - Hệ thống quản lý tài liệu và hỗ trợ giảng dạy sử dụng RAG

**Phiên bản:** 1.5
**Cập nhật:** 12/07/2026
**Trạng thái:** Nguồn yêu cầu nghiệp vụ chính thức

## 1. Bài toán

Giảng viên CNTT phải quản lý nhiều giáo trình, bài giảng, tài liệu tham khảo và tài liệu tự biên soạn. Lưu file theo thư mục chỉ giải quyết việc lưu trữ, chưa giúp tìm kiếm nội dung, kiểm soát chất lượng, tái sử dụng tài liệu hoặc khai thác nội dung bằng AI khi chuẩn bị giảng dạy.

Sản phẩm được xây dựng như một thư viện học liệu dùng chung cho giảng viên. Trọng tâm của hệ thống là **Document**. Giảng viên upload, quản lý và khai thác tài liệu; Admin kiểm duyệt trước khi tài liệu được công bố vào Library. RAG giúp giảng viên hỏi đáp trên tài liệu đã chọn và nhận câu trả lời có citation kiểm chứng được.

Hệ thống không phải LMS đầy đủ. Không bắt giảng viên tạo Course/Lecture trước khi upload. Subject, topic, chapter và tags chỉ là metadata của Document để phân loại, lọc, tìm kiếm và bổ sung ngữ cảnh cho RAG.

## 2. Mục tiêu

- Quản lý tài liệu/học liệu theo hướng document-centric.
- Cho phép Teacher upload PDF/TXT và gắn metadata nếu cần.
- Tự động analyze nhẹ sau khi upload để xác định tài liệu có thể RAG hay không.
- Chỉ tạo chunks/embeddings sau khi tài liệu được Admin approve.
- Kiểm duyệt tài liệu trước khi đưa vào thư viện chung.
- Tìm kiếm, lọc và khai thác tài liệu đã công bố.
- Hỏi đáp RAG trên tài liệu được chọn và trả citation.
- Giữ quyền sở hữu, quyền truy cập và trạng thái rõ ràng.

## 3. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Document | Tài liệu PDF/TXT do Teacher upload; là thực thể trung tâm của hệ thống |
| Subject | Môn học hoặc lĩnh vực dùng để phân loại Document, không phải lớp học/LMS course |
| Topic | Chủ đề tùy chọn của Document |
| Chapter | Chương/bài/phần tùy chọn của Document |
| Tags | Nhãn phân loại tự do của Document |
| Library | Danh sách Document `PUBLISHED` sau khi đăng nhập |
| Processing status | Trạng thái xử lý kỹ thuật của AI |
| Publication status | Trạng thái kiểm duyệt/công bố |
| RAG | Retrieval context trước khi sinh câu trả lời |
| Citation | Document, trang, đoạn trích và score của nguồn |
| Public | Được công bố trong thư viện nội bộ, không mặc định công khai Internet |

## 4. Actor

### 4.1. Teacher - actor chính

Teacher có thể:

- Đăng nhập và xem Library.
- Upload PDF/TXT mà không cần tạo Course/Lecture trước.
- Gắn metadata cho tài liệu: subject, topic, chapter, tags, description.
- Quản lý tài liệu của mình khi còn ở trạng thái cho phép sửa.
- Theo dõi trạng thái xử lý AI.
- Retry/reprocess khi cần.
- Dùng RAG trên tài liệu của mình khi tài liệu đã được index RAG xong (`PROCESSED`).
- Gửi tài liệu cho Admin duyệt.
- Xem lý do từ chối, chỉnh sửa metadata/file và gửi lại.
- Dùng RAG trên tài liệu `PUBLISHED` của giảng viên khác.

Teacher không được sửa/xóa tài liệu của người khác và không tự đặt document thành `PUBLISHED`.

### 4.2. Admin - actor phụ

Trách nhiệm core của Admin:

- Xem hàng đợi `PENDING_REVIEW`.
- Xem metadata và file cần duyệt.
- Approve để công bố.
- Reject kèm lý do.
- Archive tài liệu đã công bố.

Chức năng Should-have của Admin:

- Xem và tìm kiếm danh sách tài khoản Teacher.
- Tạo tài khoản Teacher với mật khẩu tạm thời.
- Sửa tên/email của Teacher.
- Khóa hoặc mở khóa tài khoản Teacher.
- Reset mật khẩu Teacher.

Admin không upload thay Teacher, không sửa nội dung chuyên môn và không quản trị hệ thống phức tạp trong MVP. Hệ thống chỉ có một Admin; tài khoản này được tạo bằng migration/seed, không tạo hoặc thay đổi role qua giao diện.

### 4.3. Student / người học

Student không cần tài khoản riêng trong MVP hiện tại. Người học tham gia qua đường dẫn quiz public do Teacher công bố. Khi mở link, người học có thể làm bài, nộp bài và xem kết quả ngay trên trang đó.

MVP chưa quản lý hồ sơ Student, lớp học, enrollment, lịch sử điểm dài hạn hoặc bảng xếp hạng lưu trong database.

## 5. Phạm vi core MVP

### Must-have

- Teacher/Admin login bằng JWT.
- Upload PDF/TXT tối đa 20 MB.
- Metadata document: subject, topic, chapter, tags, description.
- Backend tự tạo Document và processing job.
- Backend tự động gọi AI analyze nhẹ sau khi upload.
- Sau khi Admin approve, Backend gọi AI index RAG để parse, clean, chunk, embedding và lưu pgvector.
- Teacher xem hai trạng thái độc lập.
- Teacher submit review.
- Admin approve/reject/archive.
- Admin quản lý tài khoản Teacher ở mức cơ bản.
- Library chỉ hiển thị `PUBLISHED`.
- Teacher khác mở/tải tài liệu đã công bố.
- RAG theo `document_ids`, có citation và `not_found`.
- Lưu/resume lịch sử hỏi đáp RAG theo user + document.
- Teacher sinh quiz từ document `PUBLISHED + PROCESSED`, review/chỉnh sửa, xóa draft và publish quiz.
- Người học mở link quiz public, làm bài và xem kết quả cuối trang.
- Permission và test E2E cho toàn bộ luồng.

### Should-have

- Search/filter theo metadata.
- Chọn nhiều document để RAG.
- PDF preview trong ứng dụng.
- Summary một document.
- Xáo trộn đáp án quiz để tránh đáp án đúng tập trung ở một vài lựa chọn.
- Bảng `subjects` riêng nếu nhóm muốn chuẩn hóa danh mục môn học.

### Out-of-scope

- Teacher tạo/quản lý Course như LMS.
- Lecture entity là luồng nghiệp vụ bắt buộc.
- Student account, enrollment, lớp học hoặc quản lý hồ sơ sinh viên.
- Lưu quiz attempt/result/xếp hạng vào database.
- Chấm quiz phía server và ẩn đáp án đúng bằng DTO public riêng.
- Gamification, level, score dài hạn.
- OCR.
- Parse DOCX/PPTX trực tiếp.
- RAG toàn thư viện không có phạm vi.
- SSE streaming.
- Queue phân tán.
- Cloud storage bắt buộc.
- Admin dashboard phức tạp.
- Tạo thêm Admin, đổi role hoặc quản lý Student.
- Xóa cứng tài khoản Teacher.
- AI tự công bố nội dung.

## 6. Trạng thái

### Processing status

```txt
UPLOADED -> ANALYZING -> ANALYZED
                      -> FAILED

ANALYZED --Admin approve--> PROCESSING -> PROCESSED
                                      -> FAILED

FAILED/ANALYZED/PROCESSED --retry hoặc thay file--> ANALYZING
```

### Publication status

```txt
DRAFT --Teacher submit--> PENDING_REVIEW
PENDING_REVIEW --Admin approve--> PUBLISHED
PENDING_REVIEW --Admin reject--> REJECTED
REJECTED --Teacher sửa và submit lại--> PENDING_REVIEW
PUBLISHED --Admin archive--> ARCHIVED
```

Quy tắc:

- Hai trạng thái được lưu ở hai cột riêng.
- Upload tự chạy analyze nhẹ nhưng không tự submit review.
- Chỉ document `ANALYZED` được submit review.
- `PROCESSED` nghĩa là đã index RAG xong, không phải chỉ analyze xong.
- Chỉ `PUBLISHED` xuất hiện trong Library.

## 7. Permission

| Publication status | Teacher owner | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem, sửa metadata/file, xóa, submit nếu `ANALYZED`, RAG nếu đã `PROCESSED` | Không | Không cần |
| `PENDING_REVIEW` | Xem, không thay file | Không | Xem, approve, reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem, archive |
| `REJECTED` | Xem lý do, sửa metadata/file, xóa, submit lại | Không | Xem lịch sử |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

Backend là nơi thực thi permission. AI Service không xác thực user hoặc role.

## 8. Luồng nghiệp vụ chính

### Upload và xử lý

```txt
Teacher upload tài liệu
-> nhập title/description/subject/topic/chapter/tags
-> Backend validate và lưu file
-> tạo Document: UPLOADED + DRAFT
-> tạo analyze job
-> background call AI /v1/analyze-document
-> AI parse nhẹ để xác định can_rag
-> Backend cập nhật ANALYZED hoặc FAILED
```

Không có bước bắt buộc tạo Course/Lecture trước upload.

### Review và công bố

```txt
Teacher submit document ANALYZED
-> PENDING_REVIEW
-> Admin approve
-> PUBLISHED
-> xuất hiện trong Library
-> nếu tài liệu hỗ trợ RAG, Backend gọi AI index ở background
-> index xong: PROCESSED
```

Nếu reject, Backend lưu lý do và chuyển `REJECTED`.

### Library và RAG

```txt
Teacher mở Library
-> lọc theo subject/topic/chapter/tags/từ khóa nếu cần
-> chọn document được phép truy cập
-> Backend kiểm quyền từng document_id
-> chỉ cho hỏi RAG khi document đã PUBLISHED và PROCESSED
-> AI embedding câu hỏi
-> retrieval chunks trong document_ids
-> sinh answer từ context
-> trả citations
```

## 9. Giao diện tối thiểu

```txt
/login
/library
/library/:documentId
/my-documents
/my-documents/upload
/my-documents/:documentId
/admin/reviews
/admin/reviews/:documentId
/admin/teachers
```

Sau login, Teacher vào Library. Admin có thêm khu vực Review và quản lý Teacher. Không xây dashboard riêng trong core MVP.

## 10. Yêu cầu phi chức năng

- Frontend chỉ gọi Backend.
- Backend gọi AI bằng `X-Internal-Key`.
- Draft/rejected/archived không lộ trong Library.
- Không log JWT, secret hoặc OpenAI key.
- Reprocess dùng transaction để không mất chunks cũ khi insert lỗi.
- `storage_key` luôn là relative path dưới `UPLOAD_ROOT`.
- AI chỉ trả lời dựa trên retrieved context.
- Citation phải truy ngược được về document và page.

## 11. Tiêu chí hoàn thành

Core MVP hoàn thành khi chạy được:

```txt
Teacher A login
-> upload PDF/TXT
-> nhập metadata subject/topic/chapter/tags
-> Backend tạo Document/job
-> AI analyze nhẹ và Backend cập nhật ANALYZED
-> Teacher A submit review
-> Admin approve
-> document xuất hiện trong Library
-> AI index RAG và lưu chunks/vector
-> Teacher B mở document
-> hỏi RAG
-> nhận answer + citation đúng nguồn
-> Teacher sinh quiz từ document đã PUBLISHED + PROCESSED
-> review/chỉnh sửa và publish quiz
-> copy link public
-> người học mở link quiz, làm bài, nộp bài và xem kết quả
```

Những phần như lưu attempt/result/xếp hạng quiz vào database, chấm điểm phía server, OCR hoặc dashboard thống kê phức tạp không làm MVP thất bại nếu chưa triển khai.