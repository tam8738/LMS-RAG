# Quy Tắc Gen Code — Admin Teacher Management API

> Áp dụng cho module `admin/teachers` trong LMS-RAG (Spring Boot). Đồng bộ với chuẩn `ApiResponse` / `ErrorCode` / `GlobalExceptionHandler` đã có trong dự án.

---

## 1. Danh sách endpoint

| # | Method | Endpoint | Mô tả |
|---|--------|----------|-------|
| 1 | GET | `/api/v1/admin/teachers` | Danh sách + search/filter/pagination |
| 2 | POST | `/api/v1/admin/teachers` | Tạo 1 teacher |
| 3 | POST | `/api/v1/admin/teachers/batch` | Tạo hàng loạt |
| 4 | PATCH | `/api/v1/admin/teachers/{teacherId}` | Cập nhật |
| 5 | POST | `/api/v1/admin/teachers/{teacherId}/activate` | Kích hoạt |
| 6 | POST | `/api/v1/admin/teachers/{teacherId}/deactivate` | Vô hiệu hóa |
| 7 | POST | `/api/v1/admin/teachers/{teacherId}/reset-password` | Reset mật khẩu |

---

## 2. Cấu trúc package

```
com.lmsrag.backend
├── controller/admin/TeacherAdminController.java
├── service/admin/TeacherAdminService.java
├── service/admin/impl/TeacherAdminServiceImpl.java
├── dto/request/admin/teacher/
│   ├── TeacherCreateRequest.java
│   ├── TeacherBatchCreateRequest.java
│   ├── TeacherUpdateRequest.java
│   └── TeacherSearchRequest.java
├── dto/response/admin/teacher/
│   ├── TeacherResponse.java
│   ├── TeacherBatchCreateResponse.java
│   └── TeacherResetPasswordResponse.java
├── entity/Teacher.java (hoặc User + role TEACHER)
├── mapper/TeacherMapper.java (MapStruct)
└── exception/ErrorCode.java (bổ sung nhóm TEACHER_xxx)
```

**Quy tắc:** Controller **không** chứa business logic — chỉ nhận request, validate, gọi service, trả `ApiResponse`. Toàn bộ logic nằm ở Service.

---

## 3. Chuẩn Controller

- Class annotate: `@RestController`, `@RequestMapping("/api/v1/admin/teachers")`, `@RequiredArgsConstructor`, `@Validated`.
- Toàn bộ endpoint yêu cầu `@PreAuthorize("hasRole('ADMIN')")` ở mức class (không lặp lại từng method).
- Request body luôn có `@Valid`.
- Path variable đặt tên rõ ràng: `@PathVariable Long teacherId` (không dùng `id` chung chung).
- Mỗi method có Javadoc ngắn: mục đích + quyền yêu cầu.
- Không trả trực tiếp Entity — luôn qua DTO Response.
- Không tự try-catch trong Controller — để `GlobalExceptionHandler` xử lý.

```java
@RestController
@RequestMapping("/api/v1/admin/teachers")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
public class TeacherAdminController {

    private final TeacherAdminService teacherAdminService;

    @GetMapping
    public ApiResponse<PageResponse<TeacherResponse>> getTeachers(
            @Valid TeacherSearchRequest request) {
        return ApiResponse.success(teacherAdminService.searchTeachers(request));
    }

    @PostMapping
    public ApiResponse<TeacherResponse> createTeacher(
            @Valid @RequestBody TeacherCreateRequest request) {
        return ApiResponse.success(teacherAdminService.createTeacher(request));
    }
}
```

---

## 4. Chuẩn Response Envelope

Giữ nguyên format đã chuẩn hóa của dự án:

```json
// Success
{
  "success": true,
  "data": { },
  "message": "string",
  "meta": { "page": 0, "size": 20, "totalElements": 100, "totalPages": 5 }
}

// Error
{
  "success": false,
  "error": {
    "code": "TEACHER_NOT_FOUND",
    "message": "Teacher not found"
  }
}
```

- `meta` chỉ xuất hiện với response dạng list/page.
- Không nhét thông tin lỗi vào `data`.

---

## 5. Chuẩn Request DTO

### 5.1 `TeacherSearchRequest` (query params — GET)
```java
public record TeacherSearchRequest(
    String keyword,          // search theo tên/email/mã GV
    Boolean isActive,        // filter trạng thái
    String department,       // filter khoa/bộ môn
    @Min(0) Integer page,
    @Min(1) @Max(100) Integer size,
    String sortBy,           // whitelist field, tránh SQL injection qua sort
    String sortDirection     // ASC | DESC
) {}
```
- Validate `sortBy` bằng enum/whitelist, **không** bind trực tiếp vào `ORDER BY`.
- `page`/`size` có default (0 / 20) nếu null — xử lý ở Service, không set default trong DTO.

### 5.2 `TeacherCreateRequest`
```java
public record TeacherCreateRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotNull UserRole role,
    @NotBlank @Email @Size(max = 255) String email,
    @Past LocalDate dateOfBirth,
    Gender gender,
    String department,
    String phoneNumber,
    @PastOrPresent LocalDate hireDate
) {}
```
- Ba trường bắt buộc là `name`, `role`, `email`; các trường hồ sơ còn lại không bắt buộc.
- Email hợp lệ lấy từ request, được chuyển về chữ thường và kiểm tra trùng trước khi lưu.
- Hệ thống sinh mật khẩu tạm ngẫu nhiên, chỉ lưu BCrypt hash và không trả plaintext qua API.
- Email phải unique.
- Sau khi transaction commit, gửi email và mật khẩu tạm bất đồng bộ đến email đăng nhập; lỗi SMTP không rollback tài khoản.

### 5.3 `TeacherBatchCreateRequest`
```java
public record TeacherBatchCreateRequest(
    @NotEmpty @Size(max = 200) @Valid List<TeacherCreateRequest> teachers
) {}
```
- Giới hạn số lượng tối đa mỗi batch (vd 200) để tránh lạm dụng.
- Xử lý **partial success**: không rollback toàn bộ nếu 1 record lỗi — trả kết quả chi tiết từng dòng (xem 5.6 Response).

### 5.4 `TeacherUpdateRequest` (PATCH — tất cả field optional)
```java
public record TeacherUpdateRequest(
    @Size(min = 2, max = 100) String name,
    @Email String email,
    @Past LocalDate dateOfBirth,
    Gender gender,
    String department,
    String phoneNumber,
    @PastOrPresent LocalDate hireDate
) {}
```
- PATCH chỉ update field **khác null** — dùng MapStruct `@BeanMapping(nullValuePropertyMappingStrategy = IGNORE)` hoặc kiểm tra thủ công.
- Email được phép cập nhật nhưng phải chuẩn hóa và kiểm tra trùng; không cho update `role`.

### 5.5 Response chuẩn — `TeacherResponse`
```java
public record TeacherResponse(
    Long id,
    String email,
    String name,
    UserRole role,
    LocalDate dateOfBirth,
    Gender gender,
    String department,
    String phoneNumber,
    LocalDate hireDate,
    UserStatus status,
    Instant createdAt,
    Instant updatedAt
) {}
```
- **Không bao giờ** trả password/hash trong bất kỳ response nào.

### 5.6 Response batch — `TeacherBatchCreateResponse`
```java
public record TeacherBatchCreateResponse(
    int totalRequested,
    int successCount,
    int failureCount,
    List<TeacherResponse> created,
    List<BatchItemError> errors
) {
    public record BatchItemError(
        int index,
        String name,
        String email,
        String errorCode,
        String message
    ) {}
}
```

### 5.7 Response reset password — `TeacherResetPasswordResponse`
```java
public record TeacherResetPasswordResponse(
    Long teacherId,
    boolean emailSent,
    Instant resetAt
) {}
```
- **Không** trả mật khẩu mới (plaintext) trong response, kể cả khi admin thao tác. Gửi qua email/kênh riêng, hoặc trả link đặt lại mật khẩu có thời hạn.

---

## 6. Chuẩn Service Layer

- Interface `TeacherAdminService` + impl riêng, method tương ứng 1-1 với endpoint.
- Mọi thao tác ghi (create/update/activate/deactivate/reset-password) bọc `@Transactional`.
- Batch create: xử lý từng item trong transaction riêng (`REQUIRES_NEW` hoặc catch lỗi per-item) để không fail toàn bộ batch vì 1 lỗi.
- Log hành động nhạy cảm (activate/deactivate/reset-password) kèm `adminId` thực hiện — phục vụ audit.
- Kiểm tra tồn tại trước khi update/activate/deactivate: `findByIdOrThrow()` helper dùng chung, ném `ErrorCode.TEACHER_NOT_FOUND`.

```java
public interface TeacherAdminService {
    PageResponse<TeacherResponse> searchTeachers(TeacherSearchRequest request);
    TeacherResponse createTeacher(TeacherCreateRequest request);
    TeacherBatchCreateResponse createTeachersBatch(TeacherBatchCreateRequest request);
    TeacherResponse updateTeacher(Long teacherId, TeacherUpdateRequest request);
    TeacherResponse activateTeacher(Long teacherId);
    TeacherResponse deactivateTeacher(Long teacherId);
    TeacherResetPasswordResponse resetPassword(Long teacherId);
}
```

---

## 7. Chuẩn ErrorCode (bổ sung nhóm TEACHER)

Theo pattern hiện tại của dự án — tổ chức theo **entity**, không theo action:

```java
// ErrorCode.java — nhóm TEACHER
TEACHER_NOT_FOUND(404, "TEACHER_NOT_FOUND", "Teacher not found"),
TEACHER_EMAIL_ALREADY_EXISTS(409, "TEACHER_EMAIL_ALREADY_EXISTS", "Email already registered"),
TEACHER_ALREADY_ACTIVE(400, "TEACHER_ALREADY_ACTIVE", "Teacher is already active"),
TEACHER_ALREADY_INACTIVE(400, "TEACHER_ALREADY_INACTIVE", "Teacher is already inactive"),
TEACHER_BATCH_LIMIT_EXCEEDED(400, "TEACHER_BATCH_LIMIT_EXCEEDED", "Batch size exceeds limit"),
```

- Không dùng chung `RESOURCE_NOT_FOUND` generic — mỗi entity có mã lỗi riêng để FE dễ xử lý.
- Áp dụng nguyên tắc bảo mật tương tự `INVALID_CREDENTIALS`: với `reset-password`, nếu teacherId không tồn tại vẫn có thể cân nhắc trả response mơ hồ tùy mức độ nhạy cảm (tuỳ policy — với admin API nội bộ có thể trả rõ `TEACHER_NOT_FOUND`).

---

## 8. Validation & Bảo mật

- Toàn bộ input qua Bean Validation (`jakarta.validation`) — không validate thủ công trong Controller.
- Email lấy từ request và luôn được kiểm tra unique trước khi commit.
- `teacherId` dùng kiểu `Long`, đồng bộ với khóa chính `BIGSERIAL` hiện tại.
- Endpoint activate/deactivate/reset-password: idempotent-aware — nếu đã ở trạng thái đó rồi thì trả lỗi rõ ràng (`TEACHER_ALREADY_ACTIVE`...), không âm thầm no-op.
- Rate limit riêng cho `POST /batch` và `reset-password` (dễ bị lạm dụng).
- Ghi audit log (ai, làm gì, khi nào) cho mọi hành động thay đổi trạng thái tài khoản.

---

## 9. Pagination chuẩn (dùng lại cho mọi list API)

```java
public record PageResponse<T>(
    List<T> items,
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
```

- Convert từ Spring `Page<T>` bằng helper chung `PageMapper.toPageResponse(Page<T> page, Function<Entity, DTO> mapper)`.
- Field `sortBy` phải map qua whitelist enum, ví dụ:
```java
public enum TeacherSortField {
    NAME("name"), EMAIL("email"), CREATED_AT("createdAt");
}
```

---

## 10. Mapper (MapStruct)

```java
@Mapper(componentModel = "spring")
public interface TeacherMapper {
    TeacherResponse toResponse(Teacher entity);
    Teacher toEntity(TeacherCreateRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(TeacherUpdateRequest request, @MappingTarget Teacher entity);
}
```

---

## 11. Checklist khi gen code cho 1 endpoint mới trong module này

1. DTO Request có đủ validation annotation chưa?
2. DTO Response có lộ field nhạy cảm (password, token nội bộ) không?
3. Controller có đúng `@PreAuthorize`, không chứa logic nghiệp vụ?
4. Service có `@Transactional` cho thao tác ghi?
5. Đã thêm `ErrorCode` riêng cho case lỗi mới (nếu có) chưa, đặt đúng nhóm entity?
6. Có cần audit log không (activate/deactivate/reset-password luôn cần)?
7. Response có tuân đúng envelope `ApiResponse` (success/data/message/meta hoặc success/error) không?
8. Batch endpoint có xử lý partial failure và giới hạn kích thước không?
