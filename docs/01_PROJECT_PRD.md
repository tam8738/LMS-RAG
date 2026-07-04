# PRD - Hệ thống quản lý tài liệu và hỗ trợ giảng dạy sử dụng RAG

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
**Trạng thái:** Nguồn yêu cầu nghiệp vụ chính thức

## 1. Bài toán

Giảng viên CNTT phải quản lý nhiều giáo trình, bài giảng và tài liệu tham khảo.
Lưu file theo thư mục chỉ giải quyết việc lưu trữ, chưa giúp tìm kiếm nội dung,
kiểm soát chất lượng hoặc tái sử dụng tài liệu khi chuẩn bị giảng dạy.

Sản phẩm được xây dựng như một thư viện tài liệu giảng dạy dùng chung. Giảng
viên đóng góp và quản lý tài liệu của mình; Admin kiểm duyệt trước khi tài liệu
được công bố. RAG giúp giảng viên tra cứu nội dung có nguồn kiểm chứng.

## 2. Mục tiêu

- Quản lý tài liệu theo môn học và bài giảng.
- Tự động xử lý PDF/TXT thành chunks và embeddings sau khi upload.
- Kiểm duyệt tài liệu trước khi đưa vào thư viện chung.
- Tìm kiếm và khai thác tài liệu đã công bố.
- Hỏi đáp trên tài liệu được chọn và trả citation.
- Giữ quyền sở hữu, quyền truy cập và trạng thái rõ ràng.

Hệ thống không phải một LMS đầy đủ và không lấy Student flow làm trọng tâm.

## 3. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Document | Tài liệu PDF/TXT do giảng viên upload |
| Library | Danh sách document `PUBLISHED` sau khi đăng nhập |
| Processing status | Trạng thái xử lý kỹ thuật của AI |
| Publication status | Trạng thái kiểm duyệt/công bố |
| RAG | Retrieval context trước khi sinh câu trả lời |
| Citation | Document, trang, đoạn trích và score của nguồn |
| Public | Được công bố trong thư viện nội bộ, không mặc định công khai Internet |

## 4. Actor

### 4.1. Teacher - actor chính

Teacher có thể:

- Đăng nhập và xem Library.
- Tạo/chọn course và lecture để phân loại tài liệu.
- Upload và quản lý tài liệu của mình.
- Theo dõi trạng thái xử lý.
- Retry/reprocess khi cần.
- Dùng RAG trên tài liệu của mình đã `PROCESSED`.
- Gửi tài liệu cho Admin duyệt.
- Xem lý do từ chối, chỉnh sửa và gửi lại.
- Dùng RAG trên tài liệu `PUBLISHED` của giảng viên khác.

Teacher không được sửa/xóa tài liệu của người khác và không tự đặt document
thành `PUBLISHED`.

### 4.2. Admin - actor phụ

Admin chỉ:

- Xem hàng đợi `PENDING_REVIEW`.
- Xem metadata và file cần duyệt.
- Approve để công bố.
- Reject kèm lý do.
- Archive tài liệu đã công bố.

Admin không upload thay Teacher, không sửa nội dung chuyên môn và không quản
trị hệ thống phức tạp trong MVP.

### 4.3. Student

Student flow nằm ngoài core MVP. Role có thể tồn tại trong hệ thống nhưng không
cần màn hình, API nghiệp vụ hoặc quiz attempt/result trong giai đoạn này.

## 5. Phạm vi core MVP

### Must-have

- Teacher/Admin login bằng JWT.
- Course/Lecture tối thiểu để phân loại document.
- Upload PDF/TXT tối đa 20 MB.
- Backend tự tạo Document và processing job.
- Backend tự động gọi AI sau khi upload.
- AI parse, clean, chunk, embedding và lưu pgvector.
- Teacher xem hai trạng thái độc lập.
- Teacher submit review.
- Admin approve/reject/archive.
- Library chỉ hiển thị `PUBLISHED`.
- Teacher khác mở/tải tài liệu đã công bố.
- RAG theo `document_ids`, có citation và `not_found`.
- Permission và test E2E cho toàn bộ luồng.

### Should-have

- Search/filter theo metadata.
- Chọn nhiều document để RAG.
- PDF preview trong ứng dụng.
- Summary một document.
- Question generation từ selected documents.
- Lịch sử hỏi đáp.

### Out-of-scope

- Student flow.
- Quiz attempt/result.
- Gamification, level, score.
- OCR.
- Parse DOCX/PPTX trực tiếp.
- RAG toàn thư viện không có phạm vi.
- SSE streaming.
- Queue phân tán.
- Cloud storage bắt buộc.
- Admin dashboard phức tạp.
- AI tự công bố nội dung.

## 6. Trạng thái

### Processing status

```txt
UPLOADED -> PROCESSING -> PROCESSED
                      -> FAILED

FAILED/PROCESSED --retry hoặc thay file--> PROCESSING
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
- Upload tự chạy processing nhưng không tự submit review.
- Chỉ document `PROCESSED` được submit.
- Chỉ `PUBLISHED` xuất hiện trong Library.

## 7. Permission

| Publication status | Teacher owner | Teacher khác | Admin |
|---|---|---|---|
| `DRAFT` | Xem, sửa, xóa, RAG nếu `PROCESSED`, submit | Không | Không cần |
| `PENDING_REVIEW` | Xem, không thay file | Không | Xem, approve, reject |
| `PUBLISHED` | Xem/RAG | Xem/RAG | Xem, archive |
| `REJECTED` | Xem lý do, sửa, xóa, submit lại | Không | Xem lịch sử |
| `ARCHIVED` | Xem lịch sử | Không | Xem |

Backend là nơi thực thi permission. AI Service không xác thực user hoặc role.

## 8. Luồng nghiệp vụ chính

### Upload và xử lý

```txt
Teacher upload
-> Backend validate và lưu file
-> tạo Document: UPLOADED + DRAFT
-> tạo processing job
-> background call AI
-> AI lưu chunks/vector
-> Backend cập nhật PROCESSED hoặc FAILED
```

### Review và công bố

```txt
Teacher submit document PROCESSED
-> PENDING_REVIEW
-> Admin approve
-> PUBLISHED
-> xuất hiện trong Library
```

Nếu reject, Backend lưu lý do và chuyển `REJECTED`.

### RAG

```txt
Teacher chọn document được phép truy cập
-> Backend kiểm quyền từng document_id
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
```

Sau login, Teacher vào Library. Admin có thêm khu vực Review. Không xây
dashboard riêng trong core MVP.

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
-> Backend tạo Document/job
-> AI lưu chunks/vector
-> Teacher A submit review
-> Admin approve
-> document xuất hiện trong Library
-> Teacher B mở document
-> hỏi RAG
-> nhận answer + citation đúng nguồn
```

Summary/question chưa hoàn thành không làm core MVP thất bại.
