# Kế Hoạch Triển Khai Admin Quản Lý Giảng Viên

**Phiên bản:** 1.1
**Cập nhật:** 23/07/2026
**Trạng thái:** Kế hoạch lịch sử, đã được thay thế bởi implementation BE-09 hiện tại
**Phạm vi:** Thiết kế read-only ban đầu; không dùng làm API contract
**Owner tổng hợp:** Backend + Frontend  
**Không liên quan trực tiếp:** AI Service

> **Lưu ý:** Kế hoạch bên dưới đề xuất các endpoint read-only như
> `GET /api/v1/admin/teachers/{teacherId}` và
> `GET /api/v1/admin/teachers/{teacherId}/documents`, nhưng các endpoint này không có trong
> controller hiện tại. Implementation đã chuyển sang bộ API quản lý tài khoản Teacher gồm list,
> create, batch create, update, activate/deactivate và reset password. Dùng
> `BE09_TEACHER_MANAGEMENT_DESIGN.md` và `API_ROLES.md` làm nguồn hiện hành.

## 1. Mục Tiêu

Bổ sung màn hình để Admin có thể theo dõi danh sách giảng viên trong hệ thống và nắm được tình hình tài liệu của từng giảng viên.

Trong bản đầu, tính năng này tập trung vào nhu cầu quản trị và báo cáo:

- Admin xem được hiện tại có bao nhiêu giảng viên.
- Admin xem danh sách giảng viên có phân trang, tìm kiếm.
- Admin xem thông tin cơ bản của từng giảng viên.
- Admin xem số lượng tài liệu mà mỗi giảng viên đã upload.
- Admin xem thống kê tài liệu theo trạng thái xử lý AI và trạng thái công bố.
- Admin mở được danh sách tài liệu của một giảng viên để kiểm tra nhanh.

Tính năng này giúp đồ án có thêm phần quản trị hệ thống rõ ràng hơn, đồng thời tạo dữ liệu tốt cho báo cáo tốt nghiệp: use case Admin, bảng thống kê, API quản trị, sơ đồ sequence và phân quyền.

## 2. Phạm Vi MVP Của Task Này

### Làm Trong V1

- Trang Admin danh sách giảng viên.
- Trang Admin chi tiết một giảng viên.
- API lấy danh sách giảng viên kèm thống kê tài liệu.
- API lấy chi tiết một giảng viên.
- API lấy danh sách tài liệu của một giảng viên.
- Kiểm quyền: chỉ `ADMIN` được truy cập.
- FE hiển thị loading, empty state, error state.
- FE hỗ trợ route thật để copy/link và reload không mất trang.

### Không Làm Trong V1

- Tạo tài khoản giảng viên mới.
- Sửa thông tin giảng viên.
- Khóa/mở khóa tài khoản.
- Reset mật khẩu.
- Export Excel/CSV.
- Dashboard biểu đồ nâng cao.
- Thông báo realtime.
- Quản lý sinh viên.

Các phần tạo/sửa/khóa/reset tài khoản đã được mô tả rộng hơn trong `BE09_TEACHER_MANAGEMENT_DESIGN.md`, có thể triển khai ở phase sau.

## 3. Quyết Định Kiến Trúc

| Phần | Owner | Trách nhiệm |
|---|---|---|
| Backend | BE | Tạo API admin, query thống kê, phân quyền, validate teacher tồn tại |
| Frontend | FE | Tạo route, navigation, service, màn danh sách, màn chi tiết, UX state |
| AI Service | AI | Không cần sửa trong task này |
| Database | BE | Ưu tiên dùng bảng có sẵn, chưa thêm migration nếu chỉ làm read-only |

Nguyên tắc:

- `users` là nguồn dữ liệu chính cho tài khoản giảng viên.
- `documents.uploaded_by` là quan hệ để đếm tài liệu theo giảng viên.
- Không kéo toàn bộ documents lên Java để đếm nếu số lượng lớn; BE nên dùng query tổng hợp ở database.
- Không trả password hoặc thông tin nhạy cảm của user ra FE.
- FE không tự tính thống kê bằng cách gọi toàn bộ documents rồi đếm; FE chỉ hiển thị số liệu BE trả về.

## 4. Dữ Liệu Hiện Có Có Thể Tái Sử Dụng

### 4.1. Entity `User`

Các field đang dùng được:

- `id`
- `email`
- `name`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Task này chỉ lấy user có `role = TEACHER`.

### 4.2. Entity `Document`

Các field đang dùng được:

- `id`
- `uploadedBy`
- `title`
- `subject`
- `topic`
- `chapter`
- `processingStatus`
- `publicationStatus`
- `ragEligible`
- `fileSize`
- `createdAt`
- `updatedAt`
- `publishedAt`

Các thống kê nên lấy từ bảng `documents` theo `uploaded_by`.

## 5. API Contract Đề Xuất

Base path đề xuất:

```txt
/api/v1/admin/teachers
```

### 5.1. Lấy Danh Sách Giảng Viên

```txt
GET /api/v1/admin/teachers
```

Query params:

| Param | Type | Required | Mô tả |
|---|---|---:|---|
| `q` | string | No | Tìm theo tên hoặc email |
| `status` | `ACTIVE` hoặc `INACTIVE` | No | Lọc theo trạng thái tài khoản |
| `page` | number | No | Trang, bắt đầu từ 0 hoặc theo convention BE hiện tại |
| `size` | number | No | Số bản ghi mỗi trang |
| `sort` | string | No | Ví dụ `createdAt,desc` |

Response data:

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 2,
        "name": "Teacher A",
        "email": "teacher.a@example.com",
        "role": "TEACHER",
        "status": "ACTIVE",
        "createdAt": "2026-07-12T00:00:00Z",
        "updatedAt": "2026-07-12T00:00:00Z",
        "documentCount": 12,
        "publishedDocumentCount": 5,
        "pendingReviewDocumentCount": 2,
        "rejectedDocumentCount": 1,
        "draftDocumentCount": 4,
        "ragReadyDocumentCount": 6,
        "lastUploadAt": "2026-07-20T10:30:00Z"
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    "size": 20,
    "number": 0
  },
  "message": "Lấy danh sách giảng viên thành công"
}
```

Ghi chú:

- Nếu BE đang dùng `ApiResponse.Meta` riêng, có thể trả `data` là list và đưa pagination vào `meta`. FE chỉ cần thống nhất theo contract cuối cùng.
- `pendingReviewDocumentCount` tương ứng trạng thái tài liệu đang chờ Admin duyệt.
- `ragReadyDocumentCount` nên đếm tài liệu `ragEligible = true` và xử lý AI thành công.

### 5.2. Lấy Chi Tiết Một Giảng Viên

```txt
GET /api/v1/admin/teachers/{teacherId}
```

Response data:

```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Teacher A",
    "email": "teacher.a@example.com",
    "role": "TEACHER",
    "status": "ACTIVE",
    "createdAt": "2026-07-12T00:00:00Z",
    "updatedAt": "2026-07-12T00:00:00Z",
    "stats": {
      "documentCount": 12,
      "publishedDocumentCount": 5,
      "pendingReviewDocumentCount": 2,
      "rejectedDocumentCount": 1,
      "draftDocumentCount": 4,
      "ragReadyDocumentCount": 6,
      "totalFileSize": 24576000,
      "lastUploadAt": "2026-07-20T10:30:00Z"
    }
  },
  "message": "Lấy chi tiết giảng viên thành công"
}
```

Rule:

- Nếu `teacherId` không tồn tại hoặc không phải `TEACHER`, trả lỗi `404`.
- Nếu user gọi API không phải Admin, trả `403`.

### 5.3. Lấy Danh Sách Tài Liệu Của Giảng Viên

```txt
GET /api/v1/admin/teachers/{teacherId}/documents
```

Query params:

| Param | Type | Required | Mô tả |
|---|---|---:|---|
| `q` | string | No | Tìm theo tiêu đề, mô tả, subject, topic, chapter |
| `processingStatus` | string | No | Lọc trạng thái AI |
| `publicationStatus` | string | No | Lọc trạng thái công bố |
| `page` | number | No | Trang |
| `size` | number | No | Số bản ghi mỗi trang |

Response nên tái sử dụng `DocumentResponse` hiện có để FE không phải học thêm shape mới.

## 6. Task Backend

### BE-ADM-TEACHER-01: DTO Và Projection Cho Thống Kê

Mục tiêu:

- Tạo DTO trả về danh sách giảng viên kèm thống kê.
- Tạo DTO trả về chi tiết giảng viên.
- Tạo projection/query result nếu dùng JPQL/native query.

File gợi ý:

- `backend/src/main/java/com/lmsrag/backend/dto/admin/AdminTeacherSummaryResponse.java`
- `backend/src/main/java/com/lmsrag/backend/dto/admin/AdminTeacherDetailResponse.java`
- `backend/src/main/java/com/lmsrag/backend/dto/admin/AdminTeacherStatsResponse.java`

Commit gợi ý:

```txt
feat(be): add admin teacher management dto
```

### BE-ADM-TEACHER-02: Repository Query Danh Sách Và Thống Kê

Mục tiêu:

- Thêm query lấy user role `TEACHER`.
- Hỗ trợ tìm kiếm theo name/email.
- Hỗ trợ lọc theo `UserStatus`.
- Trả kèm các count theo trạng thái document.

Gợi ý triển khai:

- Với danh sách có phân trang, có thể dùng query từ `UserRepository`.
- Với thống kê, ưu tiên query aggregate theo `documents.uploaded_by`.
- Có thể dùng projection để tránh map thủ công quá nhiều.

Các chỉ số cần có:

- Tổng số tài liệu.
- Số tài liệu `PUBLISHED`.
- Số tài liệu đang chờ duyệt.
- Số tài liệu bị từ chối.
- Số tài liệu nháp.
- Số tài liệu sẵn sàng RAG.
- Lần upload gần nhất.

Commit gợi ý:

```txt
feat(be): query admin teacher document statistics
```

### BE-ADM-TEACHER-03: Service Layer

Mục tiêu:

- Tạo `AdminTeacherService`.
- Gom logic lấy list/detail/documents.
- Validate teacher tồn tại và đúng role.
- Không để controller chứa business logic.

File gợi ý:

- `backend/src/main/java/com/lmsrag/backend/service/AdminTeacherService.java`

Method gợi ý:

```java
Page<AdminTeacherSummaryResponse> getTeachers(String q, UserStatus status, Pageable pageable)
AdminTeacherDetailResponse getTeacherDetail(Long teacherId)
Page<DocumentResponse> getTeacherDocuments(Long teacherId, MyDocumentFilterRequest filter, Pageable pageable)
```

Commit gợi ý:

```txt
feat(be): add admin teacher management service
```

### BE-ADM-TEACHER-04: Controller API

Mục tiêu:

- Tạo endpoint dưới `/api/v1/admin/teachers`.
- Bọc response bằng `ApiResponse`.
- Thêm Swagger annotation nếu project đang dùng.
- Đảm bảo chỉ Admin gọi được.

File gợi ý:

- `backend/src/main/java/com/lmsrag/backend/controller/AdminTeacherController.java`

Endpoint cần có:

```txt
GET /api/v1/admin/teachers
GET /api/v1/admin/teachers/{teacherId}
GET /api/v1/admin/teachers/{teacherId}/documents
```

Commit gợi ý:

```txt
feat(be): expose admin teacher management api
```

### BE-ADM-TEACHER-05: Backend Tests Và Smoke Test

Mục tiêu:

- Test admin lấy danh sách teacher thành công.
- Test teacher thường gọi API bị chặn.
- Test search/filter/pagination.
- Test teacher không tồn tại trả lỗi rõ ràng.
- Test count document đúng theo seed/test data.

Lệnh kiểm tra:

```txt
cd backend
./mvnw test
```

Smoke test sau khi chạy Docker:

```txt
POST /api/v1/auth/login
GET /api/v1/admin/teachers
GET /api/v1/admin/teachers/{teacherId}
GET /api/v1/admin/teachers/{teacherId}/documents
```

Commit gợi ý:

```txt
test(be): cover admin teacher management api
```

## 7. Task Frontend

### FE-ADM-TEACHER-01: Types Và Service

Mục tiêu:

- Tạo type cho summary/detail/stats.
- Tạo service gọi API admin teacher.
- Không gọi trực tiếp `fetch`, dùng `apiFetch` hiện có.

File gợi ý:

- `frontend/src/app/types/adminTeacher.ts`
- `frontend/src/app/services/adminTeacherService.ts`

Service method gợi ý:

```ts
getTeachers(params)
getTeacherDetail(teacherId)
getTeacherDocuments(teacherId, params)
```

Commit gợi ý:

```txt
feat(fe): add admin teacher api client
```

### FE-ADM-TEACHER-02: Route Và Navigation

Mục tiêu:

- Thêm route danh sách giảng viên.
- Thêm route chi tiết giảng viên.
- Thêm item menu Admin.
- Đảm bảo role guard chỉ Admin truy cập.

File cần sửa:

- `frontend/src/app/routes.ts`
- `frontend/src/app/navigation.ts`
- `frontend/src/app/App.tsx`

Route đề xuất:

```txt
/admin/teachers
/admin/teachers/:teacherId
```

Label menu đề xuất:

```txt
Giảng viên
```

Commit gợi ý:

```txt
feat(fe): add admin teacher routes
```

### FE-ADM-TEACHER-03: Trang Danh Sách Giảng Viên

Mục tiêu:

- Hiển thị bảng hoặc list giảng viên.
- Có ô tìm kiếm tên/email.
- Có filter trạng thái nếu cần.
- Có phân trang.
- Click vào một giảng viên để mở detail.

Cột gợi ý:

- Tên giảng viên.
- Email.
- Trạng thái.
- Tổng tài liệu.
- Đã công bố.
- Chờ duyệt.
- RAG sẵn sàng.
- Lần upload gần nhất.

UX state cần có:

- Loading.
- Empty state khi chưa có giảng viên.
- Empty state khi search không có kết quả.
- Error state khi API lỗi.

File gợi ý:

- `frontend/src/app/pages/AdminTeachersPage.tsx`
- `frontend/src/app/components/AdminTeacherTable.tsx`

Commit gợi ý:

```txt
feat(fe): build admin teacher list page
```

### FE-ADM-TEACHER-04: Trang Chi Tiết Giảng Viên

Mục tiêu:

- Hiển thị thông tin giảng viên.
- Hiển thị các thẻ thống kê tài liệu.
- Hiển thị danh sách tài liệu của giảng viên đó.
- Cho phép click sang detail tài liệu hiện có nếu phù hợp.

Nội dung chính:

- Tên, email, trạng thái, ngày tạo.
- Tổng tài liệu.
- Tài liệu đã public.
- Tài liệu đang chờ duyệt.
- Tài liệu bị từ chối.
- Tài liệu sẵn sàng RAG.
- Danh sách tài liệu gần đây hoặc có phân trang.

File gợi ý:

- `frontend/src/app/pages/AdminTeacherDetailPage.tsx`
- Có thể tái sử dụng card/table document hiện có nếu phù hợp.

Commit gợi ý:

```txt
feat(fe): build admin teacher detail page
```

### FE-ADM-TEACHER-05: FE Polish Và Build

Mục tiêu:

- Kiểm tra responsive cơ bản.
- Kiểm tra URL reload vẫn đúng route.
- Kiểm tra copy link route detail dùng được.
- Kiểm tra role teacher không thấy menu Admin.
- Kiểm tra build không lỗi.

Lệnh kiểm tra:

```txt
cd frontend
npm run build
```

Commit gợi ý:

```txt
test(fe): verify admin teacher management views
```

## 8. Thứ Tự Triển Khai Đề Xuất

1. BE chốt contract response cuối cùng cho 3 endpoint.
2. BE làm DTO/projection/query.
3. BE làm service/controller.
4. BE test API bằng test hoặc Postman/curl.
5. FE tạo types/service theo contract đã chốt.
6. FE thêm route/navigation.
7. FE làm trang danh sách.
8. FE làm trang chi tiết.
9. FE nối API thật và xử lý loading/error/empty state.
10. Cả nhóm chạy full smoke test trên Docker.

## 9. Checklist Nghiệm Thu

### Backend

- Admin gọi `GET /api/v1/admin/teachers` thành công.
- Teacher gọi API admin bị từ chối.
- Search theo tên/email hoạt động.
- Filter theo status hoạt động nếu được bật trong V1.
- Pagination trả đúng tổng số bản ghi.
- Count tài liệu của từng teacher đúng với database.
- Detail teacher không tồn tại trả lỗi rõ ràng.
- Detail user không phải teacher trả lỗi rõ ràng.
- API không trả `password`.

### Frontend

- Admin thấy menu `Giảng viên`.
- Teacher không thấy menu `Giảng viên`.
- Mở `/admin/teachers` hiển thị danh sách.
- Search/filter không làm vỡ layout.
- Click một teacher mở `/admin/teachers/:teacherId`.
- Reload ở trang detail vẫn load lại dữ liệu.
- Khi API lỗi, FE hiển thị lỗi dễ hiểu.
- Khi không có dữ liệu, FE hiển thị empty state gọn.

### Tích Hợp

- Đăng nhập admin, xem được danh sách giảng viên.
- Đăng nhập teacher, không truy cập được route admin.
- Số liệu trên FE khớp với dữ liệu trong database.
- Docker build/run không lỗi.

## 10. Gợi Ý Chia Commit

Nếu muốn commit gọn theo từng phần:

```txt
docs: add admin teacher management implementation plan
feat(be): add admin teacher management api
test(be): cover admin teacher management api
feat(fe): add admin teacher management pages
```

Nếu muốn gộp nhỏ hơn cho tiện demo:

```txt
feat(be): add admin teacher overview api
feat(fe): add admin teacher management views
```

Không nên gộp BE và FE vào cùng một commit nếu hai người khác nhau cùng làm, vì sau này review và resolve conflict sẽ khó hơn.

## 11. Ảnh Hưởng Tới Báo Cáo Đồ Án

Tính năng này có thể bổ sung vào báo cáo ở các phần:

- Use case: Admin quản lý giảng viên.
- Sequence diagram: Admin xem danh sách giảng viên.
- API design: Nhóm endpoint `/api/v1/admin/teachers`.
- Database design: Dùng quan hệ `users` - `documents`.
- Security: Role-based access control cho Admin.
- Testing: Test phân quyền, search, pagination, thống kê.

ERD không bắt buộc đổi nếu V1 chỉ đọc dữ liệu từ `users` và `documents`.

## 12. Câu Hỏi Cần Chốt Trước Khi Code

- Có cần hiển thị cả tài khoản `INACTIVE` trong danh sách không?
- Pagination backend đang quy ước page bắt đầu từ `0` hay `1`?
- Trạng thái “chờ duyệt” đang map chính xác với enum nào trong `PublicationStatus`?
- Admin detail teacher có cần mở được trang detail tài liệu hay chỉ xem list?
- V1 có cần filter theo số lượng tài liệu, ví dụ “giảng viên chưa upload tài liệu nào” không?

Khuyến nghị cho V1: chưa làm filter nâng cao, chỉ cần search tên/email, pagination, thống kê count và detail.
