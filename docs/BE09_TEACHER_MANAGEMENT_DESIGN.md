# BE-09: Admin Teacher Management — Thiết kế chi tiết

> TIP-ID: BE-09  
> Owner: Tâm  
> Priority: P1 (SHOULD_HAVE)  
> Depends on: Auth ổn định  
> Estimate: 0.5 – 1 ngày  
> Cập nhật: 2026-07-15

---

## 1. Mục tiêu

Xây dựng bộ API cho phép **Admin** quản lý tài khoản Teacher, bao gồm:
- Xem danh sách Teacher (phân trang, lọc, tìm kiếm).
- Tạo Teacher đơn lẻ.
- **Tạo Teacher hàng loạt** từ danh sách.
- Cập nhật thông tin Teacher.
- Kích hoạt / vô hiệu hóa Teacher.
- Reset mật khẩu Teacher.

---

## 2. Quy tắc nghiệp vụ

1. Chỉ Admin được gọi các endpoint này.
2. Không tạo thêm tài khoản Admin qua API này.
3. Không đổi role qua UI/API này.
4. Deactivate Teacher **không xóa** documents của Teacher đó.
5. Teacher bị `INACTIVE` không đăng nhập được.
6. Reset password có thể do Admin nhập mật khẩu mới hoặc để hệ thống tự sinh.
7. Tạo hàng loạt (batch) cho phép lỗi một phần: tài khoản hợp lệ vẫn được tạo, tài khoản lỗi được liệt kê chi tiết.

---

## 3. API Endpoints

Base path: `/api/v1/admin/teachers`

| Method | Endpoint | Mô tả | Role |
|--------|----------|-------|------|
| `GET` | `/api/v1/admin/teachers` | Lấy danh sách Teacher | ADMIN |
| `POST` | `/api/v1/admin/teachers` | Tạo một Teacher | ADMIN |
| `POST` | `/api/v1/admin/teachers/batch` | **Tạo hàng loạt Teacher** | ADMIN |
| `PATCH` | `/api/v1/admin/teachers/{teacherId}` | Cập nhật Teacher | ADMIN |
| `POST` | `/api/v1/admin/teachers/{teacherId}/activate` | Kích hoạt Teacher | ADMIN |
| `POST` | `/api/v1/admin/teachers/{teacherId}/deactivate` | Vô hiệu hóa Teacher | ADMIN |
| `POST` | `/api/v1/admin/teachers/{teacherId}/reset-password` | Reset mật khẩu Teacher | ADMIN |

### 3.1 `GET /api/v1/admin/teachers`

Lấy danh sách Teacher với phân trang, lọc và tìm kiếm.

**Query params:**

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `status` | `ACTIVE` \| `INACTIVE` | No | Lọc theo trạng thái |
| `keyword` | `String` | No | Tìm theo email hoặc tên (không phân biệt hoa thường) |
| `page` | `Integer` | No | Trang (mặc định 0) |
| `size` | `Integer` | No | Kích thước trang (mặc định 20) |
| `sort` | `String` | No | Sắp xếp, ví dụ `createdAt,desc` |

**Response:**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 3,
        "email": "teacher.c@example.com",
        "name": "Teacher C",
        "role": "TEACHER",
        "status": "ACTIVE",
        "createdAt": "2026-07-11T17:31:44Z",
        "updatedAt": "2026-07-11T17:31:44Z"
      }
    ],
    "totalElements": 5,
    "totalPages": 1,
    "size": 20,
    "number": 0
  },
  "message": "Lấy danh sách Teacher thành công"
}
```

---

### 3.2 `POST /api/v1/admin/teachers`

Tạo một Teacher mới.

**Request body:**

```json
{
  "email": "teacher.c@example.com",
  "name": "Teacher C",
  "password": "password123"
}
```

**Rules:**
- `email`: bắt buộc, định dạng email hợp lệ, unique.
- `name`: bắt buộc, không rỗng.
- `password`: tùy chọn. Nếu để trống, hệ thống tự sinh password ngẫu nhiên 12 ký tự và trả về trong response.
- Nếu password được cung cấp, phải ≥ 6 ký tự.

**Response khi tự sinh password:**

```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 3,
      "email": "teacher.c@example.com",
      "name": "Teacher C",
      "role": "TEACHER",
      "status": "ACTIVE",
      "createdAt": "2026-07-15T08:00:00Z",
      "updatedAt": "2026-07-15T08:00:00Z"
    },
    "generatedPassword": "aB3#x9QrLmP!"
  },
  "message": "Tạo tài khoản Teacher thành công"
}
```

**Response khi Admin nhập password:**

```json
{
  "success": true,
  "data": {
    "teacher": {
      "id": 3,
      "email": "teacher.c@example.com",
      "name": "Teacher C",
      "role": "TEACHER",
      "status": "ACTIVE",
      "createdAt": "2026-07-15T08:00:00Z",
      "updatedAt": "2026-07-15T08:00:00Z"
    },
    "generatedPassword": null
  },
  "message": "Tạo tài khoản Teacher thành công"
}
```

---

### 3.3 `POST /api/v1/admin/teachers/batch` ⭐

Tạo hàng loạt Teacher từ danh sách.

**Request body:**

```json
{
  "teachers": [
    { "email": "teacher.c@example.com", "name": "Teacher C", "password": "pass123" },
    { "email": "teacher.d@example.com", "name": "Teacher D" },
    { "email": "teacher.a@example.com", "name": "Duplicate Email" }
  ]
}
```

**Rules:**
- Tối đa **100** tài khoản mỗi request.
- Mỗi item tuân thủ rule của `POST /api/v1/admin/teachers`.
- Xử lý từng item độc lập: lỗi một item không làm fail toàn bộ batch.
- Các tài khoản hợp lệ được tạo và lưu DB.
- Các tài khoản lỗi được liệt kê trong `failures`.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRequested": 3,
    "successCount": 2,
    "failedCount": 1,
    "createdTeachers": [
      {
        "id": 5,
        "email": "teacher.c@example.com",
        "name": "Teacher C",
        "role": "TEACHER",
        "status": "ACTIVE",
        "createdAt": "2026-07-15T08:00:00Z",
        "updatedAt": "2026-07-15T08:00:00Z"
      },
      {
        "id": 6,
        "email": "teacher.d@example.com",
        "name": "Teacher D",
        "role": "TEACHER",
        "status": "ACTIVE",
        "createdAt": "2026-07-15T08:00:00Z",
        "updatedAt": "2026-07-15T08:00:00Z"
      }
    ],
    "failures": [
      {
        "email": "teacher.a@example.com",
        "name": "Duplicate Email",
        "errorCode": "EMAIL_EXISTED",
        "message": "Email đã tồn tại"
      }
    ]
  },
  "message": "Tạo hàng loạt: 2 thành công, 1 thất bại"
}
```

**Lưu ý về generated password trong batch:**
- Vì lý do bảo mật, response của batch **không trả về plaintext password** đã sinh tự động.
- Nếu cần biết password, Admin nên cung cấp password cho từng item trong batch, hoặc sau đó dùng API reset-password.

---

### 3.4 `PATCH /api/v1/admin/teachers/{teacherId}`

Cập nhật thông tin Teacher.

**Request body:**

```json
{
  "email": "teacher.new@example.com",
  "name": "Teacher New Name"
}
```

**Rules:**
- Chỉ cập nhật các field được gửi (partial update).
- Nếu đổi `email`, phải unique.
- Không cho phép đổi `role`.

**Response:** trả về `TeacherResponse` đã cập nhật.

---

### 3.5 `POST /api/v1/admin/teachers/{teacherId}/activate`

Kích hoạt tài khoản Teacher.

**Response:** trả về `TeacherResponse` với `status = ACTIVE`.

---

### 3.6 `POST /api/v1/admin/teachers/{teacherId}/deactivate`

Vô hiệu hóa tài khoản Teacher.

**Response:** trả về `TeacherResponse` với `status = INACTIVE`.

**Rules:**
- Không xóa documents của Teacher.
- Teacher INACTIVE không thể đăng nhập.

---

### 3.7 `POST /api/v1/admin/teachers/{teacherId}/reset-password`

Reset mật khẩu cho Teacher.

**Request body:**

```json
{
  "newPassword": "newpassword123"
}
```

**Rules:**
- `newPassword`: tùy chọn. Nếu để trống, hệ thống tự sinh password ngẫu nhiên.
- Nếu cung cấp, password phải ≥ 6 ký tự.

**Response khi tự sinh password:**

```json
{
  "success": true,
  "data": {
    "teacher": { ... },
    "generatedPassword": "xY7#pL2QwR9!"
  },
  "message": "Reset mật khẩu thành công"
}
```

**Response khi Admin nhập password:**

```json
{
  "success": true,
  "data": {
    "teacher": { ... },
    "generatedPassword": null
  },
  "message": "Reset mật khẩu thành công"
}
```

---

## 4. DTO đề xuất

### 4.1 Request DTOs

```java
// Tạo / cập nhật / reset password
TeacherCreateRequest      { email, name, password }
TeacherBatchCreateRequest { List<TeacherCreateRequest> teachers }
TeacherUpdateRequest      { email, name }
ResetPasswordRequest      { newPassword }
```

### 4.2 Response DTOs

```java
TeacherResponse           { id, email, name, role, status, createdAt, updatedAt }
TeacherCreationResult     { TeacherResponse teacher, String generatedPassword }
TeacherBatchResponse      { int totalRequested, int successCount, int failedCount,
                            List<TeacherResponse> createdTeachers,
                            List<TeacherBatchErrorDetail> failures }
TeacherBatchErrorDetail   { email, name, errorCode, message }
```

---

## 5. Repository đề xuất

Mở rộng `UserRepository` thêm các method:

```java
Page<User> findByRole(UserRole role, Pageable pageable);

Page<User> findByRoleAndStatus(UserRole role, UserStatus status, Pageable pageable);

@Query("""
    SELECT u FROM User u
    WHERE u.role = :role
      AND (:status IS NULL OR u.status = :status)
      AND (:keyword IS NULL OR
           LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
           LOWER(u.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
Page<User> searchByRole(@Param("role") UserRole role,
                        @Param("status") UserStatus status,
                        @Param("keyword") String keyword,
                        Pageable pageable);
```

---

## 6. Service đề xuất

Tạo `AdminTeacherService` với các method:

```java
Page<TeacherResponse> getTeachers(UserStatus status, String keyword, Pageable pageable);
TeacherCreationResult createTeacher(TeacherCreateRequest request);
TeacherBatchResponse createTeachersBatch(TeacherBatchCreateRequest request);
TeacherResponse updateTeacher(Long teacherId, TeacherUpdateRequest request);
TeacherResponse activateTeacher(Long teacherId);
TeacherResponse deactivateTeacher(Long teacherId);
TeacherCreationResult resetPassword(Long teacherId, ResetPasswordRequest request);
```

### 6.1 Xử lý batch chi tiết

```java
for (each teacher in request):
    try:
        validate input
        check email exists
        encode password (auto-generate if blank)
        save user
        add to createdTeachers
    catch AppException:
        add to failures with errorCode + message

return TeacherBatchResponse
```

### 6.2 Sinh password tự động

```java
private String generateRandomPassword() {
    // 12 ký tự gồm chữ hoa, chữ thường, số, ký tự đặc biệt
}
```

---

## 7. Controller đề xuất

Tạo `AdminTeacherController`:

```java
@RestController
@RequestMapping("/api/v1/admin/teachers")
@Tag(name = "Admin Teacher Management")
public class AdminTeacherController { ... }
```

Các method mapping tương ứng với bảng endpoint ở mục 3.

---

## 8. Bảo mật

- Tất cả endpoint được bảo vệ bởi `.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")` trong `SecurityConfig`.
- Không cần thay đổI phân quyền hiện tại.

---

## 9. Validation & Error Handling

Sử dụng các `ErrorCode` hiện có:

| ErrorCode | Tình huống |
|-----------|------------|
| `EMAIL_REQUIRED` | Email rỗng |
| `EMAIL_INVALID` | Email sai định dạng |
| `EMAIL_EXISTED` | Email đã tồn tại |
| `NAME_REQUIRED` | Tên rỗng |
| `PASSWORD_WEAK` | Password < 6 ký tự |
| `USER_NOT_FOUND` | Teacher ID không tồn tại hoặc không phảI role TEACHER |
| `INVALID_INPUT` | Batch rỗng hoặc vượt quá 100 |

---

## 10. Acceptance Criteria

- [ ] Admin tạo Teacher đơn lẻ được.
- [ ] Admin tạo hàng loạt Teacher được, lỗi một phần vẫn tạo được phần còn lại.
- [ ] Admin cập nhật thông tin Teacher được.
- [ ] Admin activate/deactivate Teacher được.
- [ ] Admin reset password Teacher được.
- [ ] Teacher bị INACTIVE không login được.
- [ ] Deactivate Teacher không xóa documents.
- [ ] Không làm ảnh hưởng core upload/review/RAG.
