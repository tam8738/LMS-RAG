# Danh sách API Backend & Phân quyền

> Tài liệu này tổng hợp các endpoint Backend (`/api/v1/**`) đang có trong source code hiện tại và role được phép truy cập.
> Cập nhật lần cuối: **2026-07-21**.

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
| `POST` | `/api/v1/auth/login` | `PUBLIC` | Đăng nhập, nhận JWT token |
| `GET` | `/api/v1/auth/me` | `AUTHENTICATED` | Lấy thông tin user đang đăng nhập |
| `POST` | `/api/v1/auth/logout` | `AUTHENTICATED` | Đăng xuất, vô hiệu hóa JWT token hiện tại |

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
| `DRAFT` | Content/download | Không | Không | Không |
| `PENDING_REVIEW` | Content/download | Content | Không | Không |
| `PUBLISHED` | Content/download | Content/download | Content/download | Content only nếu endpoint cho phép |
| `REJECTED` | Content/download | Không | Không | Không |
| `ARCHIVED` | Content/download tùy rule service | Content/download tùy rule service | Không | Không |

## 3. Admin Reviews (`/api/v1/admin`)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/v1/admin/reviews` | `ADMIN` | Lấy danh sách tài liệu chờ duyệt |
| `GET` | `/api/v1/admin/reviews/{documentId}` | `ADMIN` | Lấy chi tiết tài liệu chờ duyệt |
| `POST` | `/api/v1/admin/reviews/{documentId}/approve` | `ADMIN` | Duyệt tài liệu, kích hoạt index RAG |
| `POST` | `/api/v1/admin/reviews/{documentId}/reject` | `ADMIN` | Từ chối tài liệu kèm lý do |
| `POST` | `/api/v1/admin/documents/{documentId}/archive` | `ADMIN` | Archive tài liệu đã công bố |

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

## 7. Admin Teacher Management

Tính năng Admin quản lý giảng viên đang được theo dõi trong:

```txt
docs/14_ADMIN_TEACHER_MANAGEMENT_IMPLEMENTATION_PLAN.md
docs/BE09_TEACHER_MANAGEMENT_DESIGN.md
```

Nếu branch/code hiện tại đã merge BE-09, cần bổ sung chính xác các endpoint Admin Teacher vào tài liệu này sau khi đối chiếu controller thực tế. Không tự coi endpoint đã có nếu chưa thấy trong source code hoặc OpenAPI.

## 8. Swagger / API Docs

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/swagger-ui.html` | `PUBLIC` | Swagger UI |
| `GET` | `/swagger-ui/**` | `PUBLIC` | Swagger UI resources |
| `GET` | `/v3/api-docs` | `PUBLIC` | OpenAPI docs |
| `GET` | `/v3/api-docs/**` | `PUBLIC` | OpenAPI docs resources |

## 9. Lưu ý

- Các endpoint không liệt kê trong bảng trên mặc định cần kiểm tra thêm trong `SecurityConfig` và controller tương ứng.
- JWT token gửi bằng header: `Authorization: Bearer <accessToken>`.
- Frontend không gọi AI Service trực tiếp.
- AI Service chỉ tin các `document_ids` đã được Backend kiểm quyền.