# Backend Changes Log - 2026-07-15

Tài liệu ghi lại các thay đổI trên Backend trong ngày **2026-07-15**.

---

## 1. Fix lỗi filter `GET /api/v1/my/documents` không hoạt động

### Vấn đề
Khi gọi `GET /api/v1/my/documents` với các tham số lọc (`publicationStatus`, `processingStatus`, `q`, ...), API vẫn trả về toàn bộ danh sách tài liệu, không áp dụng filter.

### Nguyên nhân
- Native query `findMyDocuments` trong `DocumentRepository` có `ORDER BY d.created_at DESC` hardcoded.
- `Pageable` của Spring Data JPA tự động append sort theo tên entity property (`createdAt`) vào SQL, tạo ra câu lệnh:
  ```sql
  ORDER BY d.created_at DESC, d.createdAt asc fetch first ? rows only
  ```
- PostgreSQL báo lỗi `column d.createdat does not exist` vì `createdAt` không phảI tên cột DB.

### Cách fix
- `DocumentRepository.java`:
  - Bỏ `ORDER BY` hardcoded trong `findMyDocuments`.
  - Bỏ `ORDER BY` hardcoded trong `findLibraryDocuments`.
  - Bổ sung `countQuery` cho `findLibraryDocuments`.
- `DocumentService.java`:
  - Thêm helper `toNativePageable(Pageable)` để map entity property (camelCase) sang DB column (snake_case): `createdAt` → `created_at`, `publishedAt` → `published_at`, ...
  - Áp dụng `toNativePageable(pageable)` khi gọi `findMyDocuments` và `findLibraryDocuments`.
- `DocumentController.java`:
  - Cập nhật `@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)`.
- `LibraryController.java`:
  - Cập nhật `@PageableDefault(size = 20, sort = "publishedAt", direction = Sort.Direction.DESC)`.

### Kết quả
Các filter đã hoạt động đúng:
- `GET /api/v1/my/documents?publicationStatus=PUBLISHED` → chỉ trả PUBLISHED.
- `GET /api/v1/my/documents?processingStatus=ANALYZED` → chỉ trả ANALYZED.
- `GET /api/v1/my/documents?q=RAG` → chỉ trả tài liệu có từ khóa "RAG".

---

## 2. Xử lý lỗi enum không hợp lệ trả về 400 thay vì 500

### Vấn đề
Khi truyền giá trị enum sai (ví dụ: `publicationStatus=PROCESSED` trong khi `PROCESSED` thuộc về `processingStatus`), backend ném exception và trả về `500 Internal Server Error`.

### Cách fix
- `GlobalExceptionHandler.java`: thêm `@ExceptionHandler(MethodArgumentTypeMismatchException.class)` để bắt lỗi type mismatch (bao gồm lỗi convert enum).
- Trả về `400 Bad Request` với mã lỗi `INVALID_INPUT` và message rõ ràng:
  ```json
  {
    "success": false,
    "error": {
      "code": "INVALID_INPUT",
      "message": "Giá trị 'PROCESSED' không hợp lệ cho tham số 'publicationStatus' (yêu cầu kiểu PublicationStatus)"
    }
  }
  ```

---

## 3. Thay đổI role API reprocess-rag + kiểm tra owner

### Thay đổI
- **Endpoint cũ:** `POST /api/v1/admin/documents/{id}/reprocess-rag` (role `ADMIN`)
- **Endpoint mới:** `POST /api/v1/my/documents/{id}/reprocess-rag` (role `TEACHER`)

### Cách fix
- `AdminDocumentController.java`: xóa endpoint `reprocessRag`.
- `DocumentController.java`: thêm endpoint `reprocessRag` với path `/api/v1/my/documents/{id}/reprocess-rag`.
- `DocumentService.java`: trong `reprocessRag`, thêm `requireOwner(document, currentUser)` để đảm bảo teacher chỉ có thể reprocess tài liệu của chính mình.
- `SecurityConfig.java`:
  - Bỏ bảo vệ endpoint cũ.
  - Dựa vào rule `.requestMatchers("/api/v1/my/**").hasRole("TEACHER")` để bảo vệ endpoint mới.

### Kết quả
Teacher chỉ có thể gọi `POST /api/v1/my/documents/{id}/reprocess-rag` cho tài liệu do chính mình upload. Nếu gọi với tài liệu của teacher khác, nhận lỗi 403 `DOCUMENT_ACCESS_DENIED`.

---

## 4. Mở public 2 API Library

### Thay đổI
- `GET /api/v1/library` từ `TEACHER / ADMIN` → `PUBLIC`
- `GET /api/v1/library/{documentId}` từ `TEACHER / ADMIN` → `PUBLIC`

### Cách fix
- `SecurityConfig.java`: đổi `.requestMatchers("/api/v1/library/**").hasAnyRole("TEACHER", "ADMIN")` thành `.requestMatchers("/api/v1/library/**").permitAll()`.

### Kết quả
NgườI dùng không cần đăng nhập vẫn có thể xem danh sách và chi tiết tài liệu trong Library.

---

## 5. Bổ sung thông tin chi tiết cho `GET /api/v1/auth/me`

### Thay đổI
Response của `GET /api/v1/auth/me` bổ sung thêm `createdAt` và `updatedAt`.

### Cách fix
- `AuthUserResponse.java`: thêm 2 trường `createdAt` và `updatedAt`.
- `AuthService.java`: cập nhật `mapToAuthUserResponse` để map 2 trường mới từ `User` entity.

### Response mẫu
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Teacher A",
    "email": "teacher.a@example.com",
    "role": "TEACHER",
    "status": "ACTIVE",
    "createdAt": "2026-07-11T17:31:44.543897Z",
    "updatedAt": "2026-07-11T17:31:44.543897Z"
  },
  "message": "Lấy thông tin tài khoản thành công"
}
```

---

## 6. Thêm chức năng đăng xuất `POST /api/v1/auth/logout`

### Vấn đề
Hệ thống chưa có API đăng xuất. JWT token sau khi phát hành vẫn có hiệu lực cho đến khi hết hạn, nên cần cơ chế vô hiệu hóa token khi user đăng xuất.

### Cách fix
- `AuthService.java`: thêm phương thức `logout(String token)`:
  - Kiểm tra token còn hiệu lực.
  - Lấy thờI gian còn lại của token (`jwtService.getRemainingTime`).
  - Thêm token vào `InMemoryBlacklistService` với thờI gian còn lại thực tế.
- `AuthController.java`: thêm endpoint `POST /api/v1/auth/logout`:
  - Đọc `Authorization` header, trích xuất Bearer token.
  - Gọi `authService.logout(token)`.
  - Trả về `ApiResponse.success(null, "Đăng xuất thành công")`.
- `SecurityConfig.java`: cho phép bất kỳ user đã đăng nhập nào gọi `/api/v1/auth/logout`.
- `JwtAuthenticationFilter.java`: cải thiện response khi token bị blacklist hoặc không hợp lệ:
  - Trả về JSON chuẩn `ApiResponse` với `code: UNAUTHENTICATED` và message tiếng Việt.

### Request / Response mẫu

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Đăng xuất thành công"
}
```

**Sau khi logout, dùng lại token cũ:**
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Token không hợp lệ hoặc đã bị đăng xuất"
  }
}
```

---

## 7. Thêm API xem nội dung file document `GET /api/v1/documents/{documentId}/content`

### Vấn đề
Hệ thống chưa có API để xem/truy cập nội dung file tài liệu đã upload.

### Cách fix
- `StorageService.java`: thêm `loadFileAsResource(String storageKey)` để đọc file từ disk và trả về `Resource`.
- `DocumentService.java`: thêm `getDocumentContent(Long documentId, User currentUser)` với logic phân quyền:
  - **Owner**: xem được ở mọi trạng thái.
  - **Admin**: xem `PUBLISHED` và `PENDING_REVIEW`.
  - **Teacher khác / public**: chỉ xem `PUBLISHED`.
- `DocumentController.java`: thêm endpoint `GET /api/v1/documents/{documentId}/content`.
- `SecurityConfig.java`: cho phép public access endpoint này (phân quyền chi tiết xử lý ở service).

### Phân quyền

| Trạng thái | Owner | Admin | Teacher khác / Public |
|------------|-------|-------|----------------------|
| `DRAFT` | ✅ | ❌ | ❌ |
| `PENDING_REVIEW` | ✅ | ✅ | ❌ |
| `PUBLISHED` | ✅ | ✅ | ✅ |
| `REJECTED` / `ARCHIVED` | ✅ | ❌ | ❌ |

### Response

Trả về file binary với `Content-Type` theo MIME type của file.

### Test

- Public xem `PUBLISHED` (id=18): `200 OK`, Content-Type: `text/plain`.
- Public xem `DRAFT` (id=17): `403 DOCUMENT_ACCESS_DENIED`.
- Owner xem `DRAFT` (id=17): `200 OK`.
- Admin xem `DRAFT` (id=17): `403 DOCUMENT_ACCESS_DENIED`.
- Admin xem `PENDING_REVIEW` (id=9): `200 OK`.
- Public xem `PENDING_REVIEW` (id=9): `403 DOCUMENT_ACCESS_DENIED`.

---

## 8. Thêm API download file document `GET /api/v1/documents/{documentId}/download`

### Vấn đề
Cần API cho phép giảng viên và admin download file tài liệu đã publish; tài liệu chưa publish chỉ owner được download.

### Cách fix
- `DocumentService.java`: thêm `getDocumentDownload(Long documentId, User currentUser)` với logic phân quyền:
  - **Owner**: download được ở mọi trạng thái.
  - **Admin / Teacher khác**: chỉ download `PUBLISHED`.
  - **Public / anonymous**: không được download (endpoint yêu cầu xác thực TEACHER/ADMIN).
- `DocumentController.java`: thêm endpoint `GET /api/v1/documents/{documentId}/download`.
- `SecurityConfig.java`: yêu cầu role `TEACHER` hoặc `ADMIN` cho endpoint download.

### Phân quyền

| Trạng thái | Owner | Admin | Teacher khác | Public |
|------------|-------|-------|-------------|--------|
| `DRAFT` | ✅ | ❌ | ❌ | ❌ |
| `PENDING_REVIEW` | ✅ | ❌ | ❌ | ❌ |
| `PUBLISHED` | ✅ | ✅ | ✅ | ❌ |
| `REJECTED` / `ARCHIVED` | ✅ | ❌ | ❌ | ❌ |

### Response

Trả về file binary với `Content-Disposition: attachment; filename="..."`.

### Test

- Public download `PUBLISHED` (id=18): `401 UNAUTHENTICATED`.
- Teacher A download own `DRAFT` (id=17): `200 OK`.
- Teacher B download Teacher A `DRAFT` (id=17): `403 DOCUMENT_ACCESS_DENIED`.
- Teacher B download Teacher A `PUBLISHED` (id=18): `200 OK`.
- Admin download `PUBLISHED` (id=18): `200 OK`.
- Admin download `DRAFT` (id=17): `403 DOCUMENT_ACCESS_DENIED`.

---

## Các file đã thay đổi

| File | Mô tả thay đổI |
|------|----------------|
| `backend/src/main/java/com/lmsrag/backend/config/SecurityConfig.java` | Cập nhật phân quyền: Library public, reprocess-rag cho TEACHER |
| `backend/src/main/java/com/lmsrag/backend/controller/DocumentController.java` | Thêm endpoint reprocess-rag, cập nhật Pageable default |
| `backend/src/main/java/com/lmsrag/backend/controller/AdminDocumentController.java` | Xóa endpoint reprocess-rag |
| `backend/src/main/java/com/lmsrag/backend/controller/LibraryController.java` | Cập nhật Pageable default sort |
| `backend/src/main/java/com/lmsrag/backend/repository/DocumentRepository.java` | Bỏ ORDER BY hardcoded, bổ sung countQuery |
| `backend/src/main/java/com/lmsrag/backend/service/DocumentService.java` | Thêm `toNativePageable`, áp dụng cho native query |
| `backend/src/main/java/com/lmsrag/backend/service/AuthService.java` | Map thêm createdAt/updatedAt; thêm logout |
| `backend/src/main/java/com/lmsrag/backend/dto/AuthUserResponse.java` | Thêm createdAt/updatedAt |
| `backend/src/main/java/com/lmsrag/backend/exception/GlobalExceptionHandler.java` | Thêm handler cho type mismatch |
| `backend/src/main/java/com/lmsrag/backend/controller/AuthController.java` | Thêm endpoint logout |
| `backend/src/main/java/com/lmsrag/backend/config/JwtAuthenticationFilter.java` | Response JSON khi token blacklist/invalid |
| `backend/src/main/java/com/lmsrag/backend/service/StorageService.java` | Thêm loadFileAsResource |
| `backend/src/main/java/com/lmsrag/backend/controller/DocumentController.java` | Thêm endpoint xem nội dung file và download |
| `docs/API_ROLES.md` | File mới: tổng hợp API và role |
| `docs/BACKEND_CHANGES_2026-07-15.md` | File này |

---

## Triển khai

Backend đã được rebuild Docker image và redeploy container `lms-rag-backend`.
