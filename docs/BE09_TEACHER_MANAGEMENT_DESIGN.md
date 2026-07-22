# BE-09: Admin Teacher Management — Contract đã triển khai

**Phiên bản:** 2.0
**Cập nhật:** 23/07/2026
**Trạng thái:** Backend đã triển khai
**Priority:** P1 (Should-have)
**Phạm vi:** Backend API; không mô tả triển khai Frontend

## 1. Mục tiêu

Bộ API cho phép Admin quản lý tài khoản có role `TEACHER`:

- Xem danh sách có phân trang, tìm kiếm, lọc và sắp xếp.
- Tạo một hoặc nhiều tài khoản Teacher.
- Cập nhật thông tin Teacher.
- Kích hoạt hoặc vô hiệu hóa tài khoản.
- Reset mật khẩu bằng mật khẩu tạm do hệ thống sinh.

Tài liệu này mô tả code hiện tại. Danh sách endpoint và role canonical vẫn nằm tại
`API_ROLES.md`.

## 2. Phân quyền và envelope

Base path:

```txt
/api/v1/admin/teachers
```

Tất cả endpoint yêu cầu:

```http
Authorization: Bearer <access-token>
```

Role bắt buộc: `ADMIN`. Teacher hoặc người chưa đăng nhập lần lượt nhận `403` hoặc `401`.

Response dùng envelope chung:

```json
{
  "success": true,
  "data": {},
  "message": "...",
  "meta": null
}
```

## 3. Danh sách endpoint

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/admin/teachers` | Danh sách/search/filter Teacher |
| `POST` | `/api/v1/admin/teachers` | Tạo một Teacher |
| `POST` | `/api/v1/admin/teachers/batch` | Tạo hàng loạt, partial success |
| `PATCH` | `/api/v1/admin/teachers/{teacherId}` | Cập nhật một phần thông tin |
| `POST` | `/api/v1/admin/teachers/{teacherId}/activate` | Kích hoạt tài khoản |
| `POST` | `/api/v1/admin/teachers/{teacherId}/deactivate` | Vô hiệu hóa tài khoản |
| `POST` | `/api/v1/admin/teachers/{teacherId}/reset-password` | Sinh và lưu mật khẩu tạm mới |

## 4. `GET /api/v1/admin/teachers`

Query params:

| Param | Kiểu | Mặc định | Quy tắc |
|---|---|---|---|
| `keyword` | `String` | `null` | Tìm trong tên hoặc email |
| `isActive` | `Boolean` | `null` | `true` → `ACTIVE`, `false` → `INACTIVE` |
| `department` | `String` | `null` | Lọc theo khoa/bộ môn |
| `page` | `Integer` | `0` | Tối thiểu `0` |
| `size` | `Integer` | `20` | Từ `1` đến `100` |
| `sortBy` | `String` | `createdAt` | Chỉ nhận `name`, `email`, `createdAt`, `updatedAt` |
| `sortDirection` | `String` | `DESC` | `ASC` hoặc `DESC` |

`data` trả về:

```json
{
  "items": [
    {
      "id": 18,
      "email": "teacher@example.com",
      "name": "Nguyễn Văn A",
      "role": "TEACHER",
      "dateOfBirth": "1990-05-20",
      "gender": "MALE",
      "department": "Công nghệ thông tin",
      "phoneNumber": "0901234567",
      "hireDate": "2020-08-01",
      "status": "ACTIVE",
      "createdAt": "2026-07-23T02:00:00Z",
      "updatedAt": "2026-07-23T02:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Ngoài `data`, response envelope còn có `meta.total`, `meta.page` (đánh số từ 1),
`meta.limit` và `meta.totalPages`.

## 5. `POST /api/v1/admin/teachers`

Request:

```json
{
  "name": "Nguyễn Văn A",
  "role": "TEACHER",
  "email": "teacher@example.com",
  "dateOfBirth": "1990-05-20",
  "gender": "MALE",
  "department": "Công nghệ thông tin",
  "phoneNumber": "0901234567",
  "hireDate": "2020-08-01"
}
```

Validation chính:

- `name`, `role`, `email` bắt buộc; `role` phải đúng `TEACHER`.
- Email hợp lệ, tối đa 255 ký tự và không được trùng.
- `dateOfBirth` phải trong quá khứ; `hireDate` không được ở tương lai.
- `phoneNumber` gồm 9–15 chữ số, có thể bắt đầu bằng `+`.
- `gender`: theo enum `Gender` của Backend.
- API không nhận trường `password`.

Hệ thống chuẩn hóa email thành chữ thường, tạo tài khoản ở trạng thái `ACTIVE`, sinh mật khẩu
tạm 12 ký tự và chỉ lưu BCrypt hash. Sau khi transaction commit, email chứa thông tin đăng nhập
được gửi bất đồng bộ. Gửi email lỗi không rollback tài khoản đã tạo.

Response `data` là một `TeacherResponse`; không trả plaintext password.

## 6. `POST /api/v1/admin/teachers/batch`

Request:

```json
{
  "teachers": [
    {
      "name": "Nguyễn Văn A",
      "role": "TEACHER",
      "email": "teacher.a@example.com"
    },
    {
      "name": "Trần Thị B",
      "role": "TEACHER",
      "email": "teacher.b@example.com",
      "department": "Công nghệ thông tin"
    }
  ]
}
```

Rules:

- `teachers` bắt buộc, không rỗng, tối đa 200 phần tử.
- Mỗi phần tử dùng cùng validation với API tạo đơn lẻ.
- Partial success: lỗi một phần tử không rollback các phần tử hợp lệ.
- Mỗi tài khoản tạo thành công được gửi email bất đồng bộ như create đơn lẻ.

Response `data`:

```json
{
  "totalRequested": 2,
  "successCount": 1,
  "failureCount": 1,
  "created": [],
  "errors": [
    {
      "index": 1,
      "name": "Trần Thị B",
      "email": "teacher.b@example.com",
      "errorCode": "TEACHER_EMAIL_ALREADY_EXISTS",
      "message": "Email đã được đăng ký"
    }
  ]
}
```

## 7. `PATCH /api/v1/admin/teachers/{teacherId}`

Request nhận các field tùy chọn:

```json
{
  "name": "Nguyễn Văn A Updated",
  "email": "teacher.updated@example.com",
  "dateOfBirth": "1990-05-20",
  "gender": "MALE",
  "department": "Khoa CNTT",
  "phoneNumber": "0901234567",
  "hireDate": "2020-08-01"
}
```

Chỉ field khác `null` được cập nhật. Không cho đổi `id`, `role`, `status`, password hoặc
thời điểm tạo. Email mới vẫn phải hợp lệ và không trùng.

Response `data` là `TeacherResponse` sau cập nhật.

## 8. Activate và deactivate

Hai endpoint không nhận body:

```txt
POST /api/v1/admin/teachers/{teacherId}/activate
POST /api/v1/admin/teachers/{teacherId}/deactivate
```

- Activate tài khoản đang `ACTIVE` trả `TEACHER_ALREADY_ACTIVE`.
- Deactivate tài khoản đang `INACTIVE` trả `TEACHER_ALREADY_INACTIVE`.
- Deactivate không xóa documents của Teacher.
- `JwtAuthenticationFilter` đọc trạng thái user từ database, vì vậy tài khoản bị deactivate
  không tiếp tục truy cập bằng access token cũ.

## 9. Reset mật khẩu

```txt
POST /api/v1/admin/teachers/{teacherId}/reset-password
```

Endpoint không nhận body. Backend tự sinh mật khẩu 12 ký tự, lưu BCrypt hash và không trả
plaintext password.

Response `data`:

```json
{
  "teacherId": 18,
  "emailSent": false,
  "resetAt": "2026-07-23T02:30:00Z"
}
```

Giới hạn implementation hiện tại: reset password chưa nối email notification nên `emailSent=false`.
Trước khi dùng chức năng này trong production/demo, cần nối email reset hoặc một kênh bàn giao mật
khẩu tạm an toàn; nếu không Teacher sẽ không biết mật khẩu mới.

## 10. Error codes chính

| HTTP | Code | Ý nghĩa |
|---:|---|---|
| `400` | `INVALID_TEACHER_ROLE` | Request create dùng role khác `TEACHER` |
| `400` | `TEACHER_ALREADY_ACTIVE` | Kích hoạt tài khoản đang active |
| `400` | `TEACHER_ALREADY_INACTIVE` | Vô hiệu hóa tài khoản đang inactive |
| `400` | `INVALID_INPUT` | Request validation lỗi, gồm batch vượt 200 phần tử |
| `401` | `UNAUTHENTICATED` | Thiếu hoặc sai access token |
| `403` | `FORBIDDEN` | User không có role Admin |
| `404` | `TEACHER_NOT_FOUND` | Không tìm thấy user có role Teacher |
| `409` | `TEACHER_EMAIL_ALREADY_EXISTS` | Email Teacher đã tồn tại |

## 11. Thành phần triển khai và kiểm thử

- Controller: `controller/admin/TeacherAdminController.java`
- Service: `service/admin/impl/TeacherAdminServiceImpl.java`
- DTO request/response: `dto/request/admin/teacher`, `dto/response/admin/teacher`
- Notification tạo tài khoản: `TeacherAccountNotificationListener.java`
- Security: `/api/v1/admin/**` yêu cầu role `ADMIN`
- Migration liên quan hồ sơ/tài khoản: `V8` đến `V13`

Test hiện có bao phủ validation create, service Admin Teacher, writer transaction và mail listener.
