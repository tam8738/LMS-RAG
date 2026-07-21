# LMS-RAG Backend API - Smoke Test Cases

**Cập nhật:** 2026-07-21
**Phiên bản:** 2.0
**Scope hiện tại:** Authentication, Document MVP, Admin Review, Library, RAG, RAG Chat History

> File này đã thay thế bản test-case cũ theo hướng Course/Lecture/Student. Core MVP hiện tại là document-centric: giảng viên upload tài liệu, Admin duyệt, AI index RAG và người dùng hỏi đáp theo tài liệu. Các test Course/Lecture/Student cũ không còn phản ánh source code hiện tại.

## 1. Điều kiện trước khi test

Chạy services chính:

```powershell
docker compose up -d postgres backend ai-service pgadmin
```

Kiểm tra container:

```powershell
docker compose ps
```

Backend local thường expose qua:

```txt
http://localhost:8081
```

AI Service local thường expose qua:

```txt
http://localhost:8000
```

Tài khoản demo tùy theo seed DB hiện tại. Các tài khoản đã từng dùng trong repo:

```txt
teacher.a@example.com / 123456
teacher.b@example.com / 123456
admin@example.com     / 123456
```

Nếu seed thay đổi, kiểm tra lại Flyway migration hoặc dữ liệu trong PostgreSQL.

## 2. Authentication

### AUTH-01 - Teacher login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "teacher.a@example.com",
  "password": "123456"
}
```

Expected:

- HTTP 200.
- Response có access token/JWT.
- Response có thông tin user role `TEACHER`.

### AUTH-02 - Admin login

Tương tự AUTH-01 nhưng dùng tài khoản Admin.

Expected:

- HTTP 200.
- User role là `ADMIN`.

### AUTH-03 - Get current user

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

Expected:

- HTTP 200.
- Trả thông tin user đang đăng nhập.

### AUTH-04 - Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

Expected:

- HTTP 200.
- Token hiện tại bị vô hiệu hóa theo cơ chế blacklist của Backend.

## 3. Teacher Document Flow

### DOC-01 - Upload PDF/TXT

```http
POST /api/v1/documents
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data
```

Multipart cần có:

- `file`: PDF hoặc TXT.
- `metadata`: JSON gồm `title`, `description`, `subject`, `topic`, `chapter`, `tags`.

Expected:

- HTTP 200/201 tùy implementation.
- Tạo document mới với owner là Teacher hiện tại.
- `publicationStatus` ban đầu là `DRAFT`.
- Backend tạo job analyze và gọi AI Service ở background.

### DOC-02 - List my documents

```http
GET /api/v1/my/documents?page=0&size=20
Authorization: Bearer <teacher_token>
```

Expected:

- Chỉ thấy tài liệu của chính Teacher đang đăng nhập.
- Có `processingStatus` và `publicationStatus`.
- Hỗ trợ filter/tìm kiếm nếu truyền `q`, `processingStatus`, `publicationStatus`, `subject`, `topic`, `chapter`, `tags`.

### DOC-03 - Get my document detail

```http
GET /api/v1/my/documents/{documentId}
Authorization: Bearer <teacher_token>
```

Expected:

- Owner xem được detail.
- Teacher khác không xem được draft/rejected/private document của người khác.

### DOC-04 - Update metadata hoặc thay file

```http
PATCH /api/v1/my/documents/{documentId}
Authorization: Bearer <teacher_token>
Content-Type: multipart/form-data
```

Expected:

- Owner cập nhật được khi trạng thái cho phép.
- Nếu thay file, Backend tăng version/storage key và tạo lại analyze job.

### DOC-05 - Submit review

```http
POST /api/v1/my/documents/{documentId}/submit-review
Authorization: Bearer <teacher_token>
```

Expected:

- Chỉ submit khi document đủ điều kiện theo Backend, thường là đã analyze xong.
- `publicationStatus` chuyển sang `PENDING_REVIEW`.

### DOC-06 - File content/download

```http
GET /api/v1/documents/{documentId}/content
GET /api/v1/documents/{documentId}/download
Authorization: Bearer <token>
```

Expected:

- Content/download tuân theo permission trong `docs/API_ROLES.md`.
- Public chỉ xem được nội dung document đã `PUBLISHED` nếu endpoint content cho phép.
- Download yêu cầu đăng nhập.

## 4. Admin Review Flow

### ADM-01 - Review queue

```http
GET /api/v1/admin/reviews
Authorization: Bearer <admin_token>
```

Expected:

- Admin thấy danh sách tài liệu chờ duyệt.
- Teacher không truy cập được.

### ADM-02 - Review detail

```http
GET /api/v1/admin/reviews/{documentId}
Authorization: Bearer <admin_token>
```

Expected:

- Admin xem metadata, trạng thái xử lý, thông tin uploader và file.

### ADM-03 - Approve document

```http
POST /api/v1/admin/reviews/{documentId}/approve
Authorization: Bearer <admin_token>
```

Expected:

- `publicationStatus` chuyển sang `PUBLISHED`.
- Backend kích hoạt AI index RAG ở background.
- Sau khi index xong, `processingStatus` là `PROCESSED`.
- Tài liệu xuất hiện trong Library.

### ADM-04 - Reject document

```http
POST /api/v1/admin/reviews/{documentId}/reject
Authorization: Bearer <admin_token>
Content-Type: application/json
```

Request:

```json
{
  "reason": "Lý do từ chối"
}
```

Expected:

- `publicationStatus` chuyển sang `REJECTED`.
- Teacher owner thấy lý do từ chối.

## 5. Library và RAG

### LIB-01 - List published documents

```http
GET /api/v1/library?page=0&size=20
```

Expected:

- Chỉ trả document `PUBLISHED`.
- Hỗ trợ filter theo metadata.

### LIB-02 - Library detail

```http
GET /api/v1/library/{documentId}
```

Expected:

- Public/Teacher/Admin xem được document đã công bố.
- Không trả draft/rejected/archived.

### RAG-01 - Ask RAG legacy proxy

```http
POST /api/v1/rag/answer
Authorization: Bearer <teacher_or_admin_token>
Content-Type: application/json
```

Request:

```json
{
  "documentIds": [1],
  "question": "Tóm tắt nội dung chính của tài liệu?",
  "topK": 5,
  "language": "vi"
}
```

Expected:

- Backend kiểm tra document đã `PUBLISHED` và `PROCESSED` trước khi gọi AI.
- Nếu có context phù hợp, trả answer + citations từ chunks thật.
- Nếu không có context phù hợp, trả `notFound=true` và `citations=[]`.

## 6. RAG Chat History / Resume

### HIST-01 - Get or create conversation by document

```http
GET /api/v1/rag/conversations/by-document/{documentId}
Authorization: Bearer <teacher_or_admin_token>
```

Expected:

- Tạo conversation nếu chưa có.
- Trả messages đã lưu nếu user từng hỏi trên document này.
- Conversation scope theo user + document.

### HIST-02 - Send message via conversation

```http
POST /api/v1/rag/conversations/{conversationId}/messages
Authorization: Bearer <teacher_or_admin_token>
Content-Type: application/json
```

Request:

```json
{
  "question": "Nói chi tiết hơn về ý vừa rồi",
  "topK": 5,
  "language": "vi"
}
```

Expected:

- Backend lưu user message.
- Backend gửi history gần nhất sang AI Service.
- Backend lưu assistant message với answer/citations/notFound/tokensUsed.
- Reload trang vẫn thấy lại cả user và assistant message.

### HIST-03 - Clear conversation messages

```http
DELETE /api/v1/rag/conversations/{conversationId}/messages
Authorization: Bearer <teacher_or_admin_token>
```

Expected:

- Chỉ owner conversation được clear.
- Reload xong messages rỗng.

## 7. Admin Teacher Management

> Phần này theo assumption/plan hiện tại của nhóm: Admin quản lý giảng viên đã hoặc sẽ được triển khai ở mức cơ bản. Nếu code local chưa có đủ endpoint, ưu tiên kiểm tra `docs/14_ADMIN_TEACHER_MANAGEMENT_IMPLEMENTATION_PLAN.md` và `docs/BE09_TEACHER_MANAGEMENT_DESIGN.md`.

Các test tối thiểu nên có:

- Admin xem danh sách Teacher.
- Admin xem chi tiết Teacher.
- Mỗi Teacher có số tài liệu đã upload.
- Admin tạo Teacher mới nếu endpoint được bật.
- Admin activate/deactivate Teacher nếu endpoint được bật.
- Teacher thường không truy cập được màn/API quản lý Teacher.

## 8. Manual E2E checklist

- [ ] Teacher A login.
- [ ] Teacher A upload PDF/TXT không chọn Course/Lecture.
- [ ] Document được analyze và chuyển trạng thái phù hợp.
- [ ] Teacher A submit review.
- [ ] Admin login và approve document.
- [ ] AI index xong, document là `PUBLISHED + PROCESSED`.
- [ ] Teacher B thấy document trong Library.
- [ ] Teacher B hỏi RAG và nhận answer/citation.
- [ ] Teacher B reload trang và thấy lại lịch sử hỏi đáp.
- [ ] Teacher B hỏi câu follow-up, AI hiểu ngữ cảnh gần nhất.
- [ ] Câu hỏi không liên quan trả not-found và không hiển thị citations.
- [ ] Clear history xong reload không còn messages.

## 9. Ghi chú

- Không dùng các endpoint Course/Lecture/Student cũ để đánh giá MVP hiện tại.
- Frontend không gọi AI Service trực tiếp; mọi request nghiệp vụ đi qua Backend.
- AI Service không kiểm JWT/role; Backend chịu trách nhiệm permission.
- Với lỗi 500/502, kiểm tra log Backend trước, sau đó kiểm tra log AI Service nếu lỗi phát sinh từ RAG/index.