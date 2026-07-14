# Danh sách API Backend & Phân quyền

> Tài liệu này tổng hợp các endpoint của Backend (`/api/v1/**`) và role được phép truy cập.
> Cập nhật lần cuối: **2026-07-15**.

## Chú thích

| Ký hiệu | Ý nghĩa |
|---------|---------|
| `PUBLIC` | Không cần xác thực |
| `AUTHENTICATED` | Cần JWT hợp lệ, chấp nhận bất kỳ role nào (TEACHER / ADMIN) |
| `TEACHER` | Chỉ role `TEACHER` |
| `ADMIN` | Chỉ role `ADMIN` |
| `TEACHER / ADMIN` | Role `TEACHER` hoặc `ADMIN` |

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/auth/login` | `PUBLIC` | Đăng nhập, nhận JWT token |
| `GET` | `/api/v1/auth/me` | `AUTHENTICATED` | Lấy thông tin chi tiết user đang đăng nhập |
| `POST` | `/api/v1/auth/logout` | `AUTHENTICATED` | Đăng xuất, vô hiệu hóa JWT token hiện tại |

---

## 2. Documents - Teacher (`/api/v1`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/documents` | `TEACHER` | Upload tài liệu kèm metadata |
| `POST` | `/api/v1/documents/{documentId}/reprocess-rag` | `TEACHER` | Yêu cầu xử lý lại RAG cho tài liệu đã công bố |
| `GET` | `/api/v1/my/documents` | `TEACHER` | Lấy danh sách tài liệu của tôi (có hỗ trợ lọc, tìm kiếm, phân trang) |
| `GET` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Lấy chi tiết tài liệu của tôi |
| `PATCH` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Cập nhật metadata và/hoặc file tài liệu |
| `DELETE` | `/api/v1/my/documents/{documentId}` | `TEACHER` | Xóa tài liệu |
| `POST` | `/api/v1/my/documents/{documentId}/submit-review` | `TEACHER` | Gửi tài liệu đi duyệt |

### Tham số lọc cho `GET /api/v1/my/documents`

Tất cả đều optional:

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `q` | `String` | Tìm kiếm trong title, description, subject, topic, chapter |
| `processingStatus` | `Enum` | `UPLOADED`, `ANALYZING`, `ANALYZED`, `PROCESSING`, `PROCESSED`, `FAILED` |
| `publicationStatus` | `Enum` | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `ARCHIVED` |
| `subject` | `String` | Lọc khớp chính xác môn học |
| `topic` | `String` | Lọc khớp một phần chủ đề |
| `chapter` | `String` | Lọc khớp một phần chương |
| `tags` | `String` | Lọc theo tags, phân cách bằng dấu phẩy (ví dụ: `database,sql`) |
| `page`, `size`, `sort` | `Pageable` | Phân trang Spring (mặc định: `size=20`, `sort=createdAt,desc`) |

---

## 3. Admin Reviews (`/api/v1/admin`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/admin/reviews` | `ADMIN` | Lấy danh sách tài liệu chờ duyệt |
| `GET` | `/api/v1/admin/reviews/{documentId}` | `ADMIN` | Lấy chi tiết tài liệu chờ duyệt |
| `POST` | `/api/v1/admin/reviews/{documentId}/approve` | `ADMIN` | Duyệt tài liệu |
| `POST` | `/api/v1/admin/reviews/{documentId}/reject` | `ADMIN` | Từ chối tài liệu |
| `POST` | `/api/v1/admin/documents/{documentId}/archive` | `ADMIN` | Archive tài liệu đã công bố |

---

## 4. Library (`/api/v1/library`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/library` | `PUBLIC` | Lấy danh sách tài liệu đã công bố (có hỗ trợ lọc, tìm kiếm, phân trang) |
| `GET` | `/api/v1/library/{documentId}` | `PUBLIC` | Lấy chi tiết tài liệu trong Library |

### Tham số lọc cho `GET /api/v1/library`

Tất cả đều optional:

| Param | Kiểu | Mô tả |
|-------|------|-------|
| `q` | `String` | Tìm kiếm trong title, description, subject, topic, chapter |
| `subject` | `String` | Lọc khớp chính xác môn học |
| `topic` | `String` | Lọc khớp một phần chủ đề |
| `chapter` | `String` | Lọc khớp một phần chương |
| `tags` | `String` | Lọc theo tags, phân cách bằng dấu phẩy |
| `uploadedBy` | `Long` | Lọc theo ID ngườI upload |
| `page`, `size`, `sort` | `Pageable` | Phân trang Spring (mặc định: `size=20`, `sort=publishedAt,desc`) |

---

## 5. RAG (`/api/v1/rag`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/v1/rag/answer` | `TEACHER / ADMIN` | Hỏi đáp RAG trên danh sách tài liệu đã công bố và đã index |

---

## 6. Swagger / API Docs

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/swagger-ui.html` | `PUBLIC` | Swagger UI |
| `GET` | `/swagger-ui/**` | `PUBLIC` | Swagger UI resources |
| `GET` | `/v3/api-docs` | `PUBLIC` | OpenAPI docs |
| `GET` | `/v3/api-docs/**` | `PUBLIC` | OpenAPI docs resources |

---

## Lưu ý

- Các endpoint không liệt kê trong bảng trên mặc định yêu cầu `AUTHENTICATED` (do cấu hình `.anyRequest().authenticated()` trong `SecurityConfig`).
- JWT token cần được gửi trong header: `Authorization: Bearer <accessToken>`.
- Role được encode trong JWT dưới dạng `ROLE_TEACHER` / `ROLE_ADMIN`; Spring Security so khớp với `hasRole("TEACHER")` / `hasRole("ADMIN")`.
