# Danh sách API Backend & Phân quyền

> Tài liệu này tổng hợp các endpoint Backend (`/api/v1/**`) đang có trong source code hiện tại và role được phép truy cập.
> Cập nhật lần cuối: **2026-07-26**.

## Thay đổi API gần nhất

- Auth chuyển sang đăng nhập bằng email và trả cả access token/refresh token.
- Bổ sung rotate/revoke refresh token tại `/api/v1/auth/refresh` và `/api/v1/auth/refresh/revoke`.
- Bổ sung API hồ sơ cá nhân và đổi mật khẩu dưới `/api/v1/me`.
- Bổ sung bộ API Admin quản lý Teacher, gồm tạo đơn lẻ/hàng loạt, cập nhật, kích hoạt,
  vô hiệu hóa và reset mật khẩu.
- Bổ sung API quiz cho Teacher và public link: generate/list/get/update/delete draft/publish, public get quiz đã công bố.
- Backend gọi internal API `POST /v1/generate-quiz`, kiểm tra dữ liệu AI trả về và lưu quiz/câu hỏi vào database. Frontend không gọi AI Service trực tiếp.

## Chú thích

| Ký hiệu | Ý nghĩa |
|---------|---------|
| `PUBLIC` | Không cần xác thực |
| `AUTHENTICATED` | Cần JWT hợp lệ, chấp nhận role đang được hệ thống hỗ trợ |
| `TEACHER` | Chỉ role `TEACHER` |
| `ADMIN` | Chỉ role `ADMIN` |
| `TEACHER / ADMIN` | Role `TEACHER` hoặc `ADMIN` |

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/auth/login` | `PUBLIC` | Đăng nhập, nhận access token và refresh token |
| `POST` | `/api/v1/auth/refresh` | `PUBLIC` | Dùng refresh token để nhận cặp token mới; token cũ bị thu hồi |
| `POST` | `/api/v1/auth/refresh/revoke` | `PUBLIC` | Thu hồi refresh token; xử lý idempotent |
| `GET` | `/api/v1/auth/me` | `AUTHENTICATED` | Lấy thông tin user đang đăng nhập |
| `POST` | `/api/v1/auth/logout` | `AUTHENTICATED` | Đăng xuất, vô hiệu hóa JWT token hiện tại |

### Hồ sơ cá nhân (`/api/v1/me`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/me/profile` | `AUTHENTICATED` | Lấy hồ sơ chi tiết của tài khoản hiện tại |
| `PATCH` | `/api/v1/me/profile` | `AUTHENTICATED` | Cập nhật tên, ngày sinh, giới tính và số điện thoại |
| `POST` | `/api/v1/me/change-password` | `AUTHENTICATED` | Đổi mật khẩu và thu hồi mọi refresh token đang hoạt động |

`POST /api/v1/auth/refresh` và `POST /api/v1/auth/refresh/revoke` nhận body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

Login và refresh trả `accessToken`, `refreshToken`, `tokenType`,
`accessTokenExpiresInSeconds`, `refreshTokenExpiresAt` và thông tin user. Refresh token
được rotate sau mỗi lần sử dụng; database chỉ lưu SHA-256 hash, không lưu token thô.

`PATCH /api/v1/me/profile` không cho phép đổi các trường định danh/quản trị gồm `id`,
email đăng nhập, role, status, khoa/bộ môn và ngày tuyển dụng.

Body đổi mật khẩu:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password",
  "confirmPassword": "new-password"
}
```

## 2. Documents - Teacher (`/api/v1`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/documents` | `TEACHER` | Upload tài liệu PDF/TXT kèm metadata |
| `GET` | `/api/v1/my/documents` | `TEACHER` | Lấy danh sách tài liệu của Teacher hiện tại |
| `GET` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Lấy chi tiết tài liệu của Teacher hiện tại |
| `PATCH` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Cập nhật metadata và/hoặc file tài liệu |
| `DELETE` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Xóa tài liệu của chính mình khi trạng thái cho phép |
| `POST` | `/api/v1/my/documents/{documentId}/submit-review` | `TEACHER` | Gửi tài liệu đi duyệt |
| `POST` | `/api/v1/my/documents/{documentId}/reprocess-rag` | `TEACHER` | Yêu cầu xử lý lại RAG cho tài liệu của mình đã công bố |
| `GET` | `/api/v1/documents/{documentId}/content` | `PUBLIC` theo rule | Xem nội dung file theo quyền tài liệu |
| `GET` | `/api/v1/documents/{documentId}/download` | `TEACHER / ADMIN` theo rule | Tải file gốc theo quyền tài liệu |

### Tham số lọc cho `GET /api/v1/my/documents`

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `q` | `String` | Tìm kiếm trong title, description, subject, topic, chapter |
| `processingStatus` | `Enum` | `UPLOADED`, `ANALYZING`, `ANALYZED`, `PROCESSING`, `PROCESSED`, `FAILED` |
| `publicationStatus` | `Enum` | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `ARCHIVED` |
| `subject` | `String` | Lọc khớp chính xác môn học |
| `topic` | `String` | Lọc khớp một phần chủ đề |
| `chapter` | `String` | Lọc khớp một phần chương |
| `tags` | `String` | Lọc theo tags, phân cách bằng dấu phẩy |
| `page`, `size`, `sort` | `Pageable` | Phân trang Spring |

### Quy tắc truy cập file

| Trạng thái document | Owner | Admin | Teacher khác | Public |
|---------------------|-------|-------|--------------|--------|
| `DRAFT` | Content/download | Content/download | Không | Không |
| `PENDING_REVIEW` | Content/download | Content/download | Không | Không |
| `PUBLISHED` | Content/download | Content/download | Content/download | Content only nếu endpoint cho phép |
| `REJECTED` | Content/download | Content/download | Không | Không |
| `ARCHIVED` | Content/download tùy rule service | Content/download | Không | Không |

Admin được xem và tải file gốc ở mọi trạng thái để phục vụ quản trị, kiểm duyệt và xử lý lưu trữ tài liệu.

## 3. Admin Documents & Reviews (`/api/v1/admin`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/admin/documents` | `ADMIN` | Lấy danh sách toàn bộ tài liệu trong hệ thống, có phân trang và bộ lọc |
| `GET` | `/api/v1/admin/documents/{documentId}` | `ADMIN` | Lấy chi tiết một tài liệu bất kỳ trong hệ thống |
| `GET` | `/api/v1/admin/reviews` | `ADMIN` | Lấy danh sách tài liệu chờ duyệt |
| `GET` | `/api/v1/admin/reviews/{documentId}` | `ADMIN` | Lấy chi tiết tài liệu chờ duyệt |
| `POST` | `/api/v1/admin/reviews/{documentId}/approve` | `ADMIN` | Duyệt tài liệu, kích hoạt index RAG |
| `POST` | `/api/v1/admin/reviews/{documentId}/reject` | `ADMIN` | Từ chối tài liệu kèm lý do |
| `POST` | `/api/v1/admin/documents/{documentId}/archive` | `ADMIN` | Lưu trữ tài liệu đã công bố |
## 4. Library (`/api/v1/library`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/library` | `PUBLIC` | Lấy danh sách tài liệu đã công bố |
| `GET` | `/api/v1/library/{documentId}` | `PUBLIC` | Lấy chi tiết tài liệu trong Library |

### Tham số lọc cho `GET /api/v1/library`

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `q` | `String` | Tìm kiếm trong title, description, subject, topic, chapter |
| `subject` | `String` | Lọc khớp chính xác môn học |
| `topic` | `String` | Lọc khớp một phần chủ đề |
| `chapter` | `String` | Lọc khớp một phần chương |
| `tags` | `String` | Lọc theo tags, phân cách bằng dấu phẩy |
| `uploadedBy` | `Long` | Lọc theo ID người upload |
| `page`, `size`, `sort` | `Pageable` | Phân trang Spring |

## 5. RAG (`/api/v1/rag`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/rag/answer` | `TEACHER / ADMIN` | Hỏi đáp RAG legacy/proxy trên danh sách document đã công bố và đã index |

Backend phải kiểm tra document tồn tại, user có quyền truy cập, `publicationStatus=PUBLISHED` và `processingStatus=PROCESSED` trước khi gọi AI Service.

## 6. RAG Conversations (`/api/v1/rag/conversations`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/by-document/{documentId}` | `TEACHER / ADMIN` | Lấy hoặc tạo conversation theo user + document, trả messages đã lưu |
| `POST` | `/{conversationId}/messages` | `TEACHER / ADMIN` | Gửi câu hỏi mới, Backend lưu user/assistant messages và gọi AI |
| `GET` | `/{conversationId}/messages` | `TEACHER / ADMIN` | Lấy messages của conversation có phân trang |
| `DELETE` | `/{conversationId}/messages` | `TEACHER / ADMIN` | Xóa lịch sử messages của conversation hiện tại |

Quy tắc:

- Conversation là riêng tư theo user.
- User không được đọc/gửi/xóa conversation của user khác.
- AI Service không lưu conversation; Backend gửi tối đa history gần nhất sang AI.
- `notFound=true` phải đi kèm `citations=[]` để FE không hiển thị nguồn gây hiểu nhầm.

## 7. Admin Teacher Management (`/api/v1/admin/teachers`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/admin/teachers` | `ADMIN` | Danh sách giảng viên + search/filter/pagination |
| `POST` | `/api/v1/admin/teachers` | `ADMIN` | Tạo một tài khoản giảng viên |
| `POST` | `/api/v1/admin/teachers/batch` | `ADMIN` | Tạo hàng loạt giảng viên (partial success) |
| `PATCH` | `/api/v1/admin/teachers/{teacherId}` | `ADMIN` | Cập nhật thông tin giảng viên |
| `POST` | `/api/v1/admin/teachers/{teacherId}/activate` | `ADMIN` | Kích hoạt tài khoản giảng viên |
| `POST` | `/api/v1/admin/teachers/{teacherId}/deactivate` | `ADMIN` | Vô hiệu hóa tài khoản giảng viên |
| `POST` | `/api/v1/admin/teachers/{teacherId}/reset-password` | `ADMIN` | Đặt lại mật khẩu giảng viên |

### Dữ liệu tạo giảng viên

- Bắt buộc: `name`, `role = TEACHER`, `email` hợp lệ.
- Tùy chọn: `dateOfBirth`, `gender`, `phoneNumber`, `department`, `hireDate`.
- Email đăng nhập lấy từ request và được chuẩn hóa thành chữ thường; hệ thống kiểm tra trùng trước khi lưu.
- Trạng thái mặc định là `ACTIVE`; hệ thống sinh mật khẩu tạm ngẫu nhiên và chỉ lưu BCrypt hash.
- Sau khi transaction commit, hệ thống gửi bất đồng bộ email và mật khẩu tạm đến chính email đăng nhập.
- Batch nhận tối đa 200 phần tử và cho phép partial success.
- Reset mật khẩu không nhận body. Hệ thống tự sinh mật khẩu mới, không trả plaintext; response gồm
  `teacherId`, `emailSent`, `resetAt`. Ở implementation hiện tại `emailSent=false`, vì luồng gửi email
  mới chỉ được nối cho lúc tạo tài khoản.

### Tham số lọc cho `GET /api/v1/admin/teachers`

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `keyword` | `String` | Tìm kiếm trong email đăng nhập hoặc tên |
| `isActive` | `Boolean` | Lọc theo trạng thái tài khoản |
| `department` | `String` | Lọc theo khoa/bộ môn |
| `page`, `size`, `sortBy`, `sortDirection` | `Pageable` | Phân trang và sắp xếp |

## 8. Quiz (`/api/v1/quiz`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/quiz/my` | `TEACHER` | Lấy danh sách quiz do Teacher hiện tại tạo, dữ liệu lấy từ database |
| `POST` | `/api/v1/quiz/generate` | `TEACHER` | Sinh và lưu quiz draft từ một document `PUBLISHED + PROCESSED` |
| `GET` | `/api/v1/quiz/{quizId}` | `TEACHER` | Xem toàn bộ quiz do chính Teacher tạo |
| `PATCH` | `/api/v1/quiz/{quizId}` | `TEACHER` | Sửa metadata/câu hỏi hiện có khi quiz còn `DRAFT` |
| `DELETE` | `/api/v1/quiz/{quizId}` | `TEACHER` | Xóa hẳn một quiz khi quiz còn `DRAFT` |
| `POST` | `/api/v1/quiz/{quizId}/publish` | `TEACHER` | Chuyển quiz của chính Teacher từ `DRAFT` sang `PUBLISHED` |
| `GET` | `/api/v1/quiz/public/{quizId}` | `PUBLIC` | Lấy quiz đã công bố để người học làm bài qua link public |

Body sinh quiz:

```json
{
  "documentId": 12,
  "questionCount": 5,
  "language": "vi"
}
```

Quy tắc:

- `questionCount` từ 1 đến 10, mặc định 5; `language` nhận `vi` hoặc `en`, mặc định `vi`.
- Mỗi Teacher có thể sinh quiz từ bất kỳ document nào đã `PUBLISHED + PROCESSED`; quiz mới ghi `createdById` là Teacher hiện tại.
- Chỉ owner được xem, sửa, xóa draft hoặc publish quiz. Chỉ quiz `DRAFT` được sửa/xóa/publish.
- Endpoint public chỉ trả quiz đã `PUBLISHED`; nếu quiz chưa công bố, Backend trả lỗi `QUIZ_NOT_PUBLISHED`.
- Response hiện trả full `questions`, gồm `correctOptionIds`, `explanation` và `citations`. MVP đang chấm điểm ở Frontend; nếu cần chống lộ đáp án/chấm server thì bổ sung DTO public + submit endpoint sau MVP.

Contract triển khai chi tiết nằm tại `15_QUIZ_API_BACKEND_SPEC.md`.

## 9. Swagger / API Docs
| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/swagger-ui.html` | `PUBLIC` | Swagger UI |
| `GET` | `/swagger-ui/**` | `PUBLIC` | Swagger UI resources |
| `GET` | `/v3/api-docs` | `PUBLIC` | OpenAPI docs |
| `GET` | `/v3/api-docs/**` | `PUBLIC` | OpenAPI docs resources |

## 10. Lưu ý

- Các endpoint không liệt kê trong bảng trên mặc định cần kiểm tra thêm trong `SecurityConfig` và controller tương ứng.
- JWT token gửi bằng header: `Authorization: Bearer <accessToken>`.
- Frontend không gọi AI Service trực tiếp.
- AI Service chỉ tin các `document_ids` đã được Backend kiểm quyền.
