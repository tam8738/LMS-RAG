# Bộ tài liệu chính thức của dự án

**Phiên bản:** 1.4
**Cập nhật:** 15/07/2026
**Đối tượng đọc:** Frontend, Backend, AI Service

## 1. Mục đích

Đây là mục lục duy nhất của bộ tài liệu dùng chung. Mỗi file chỉ sở hữu một
nhóm quyết định để tránh lặp và mâu thuẫn.

## 2. Thứ tự đọc

### 1. PRD

```txt
01_PROJECT_PRD.md
```

Đọc để hiểu vấn đề, actor, phạm vi MVP, luồng nghiệp vụ và tiêu chí hoàn thành.

### 2. Kế hoạch triển khai

```txt
02_MVP_IMPLEMENTATION_PLAN.md
```

Đọc để biết owner, deadline, task graph, public API, frontend structure, migration,
test gate, handoff, branch và thứ tự thực hiện.

### 3. Quyết định tích hợp Backend - AI

```txt
03_BE_AI_INTEGRATION.md
```

Đọc để biết ownership, shared storage, auto-processing, ID, status và ranh giới
giữa hai service.

### 4. AI API contract

```txt
04_AI_API_CONTRACT.md
```

Nguồn duy nhất cho endpoint, request, response và error giữa Backend và AI.

### 5. Database schema

```txt
05_DATABASE_SCHEMA.md
```

Nguồn duy nhất cho SQL schema, constraint và index của Document MVP.

### 6. Backend database guide

```txt
07_BACKEND_DATABASE_SCHEMA_GUIDE.md
```

Đọc khi Backend tạo migration database đầy đủ cho MVP: users, documents, jobs,
chunks, khóa chính, khóa phụ, index và seed demo.

### 7. AI pipeline

```txt
06_AI_PIPELINE.md
```

Đọc để hiểu thuật toán xử lý tài liệu, retrieval, RAG, citation và test AI.

### 8. Thiết kế hệ thống tổng quan

```txt
08_SYSTEM_DESIGN.md
```

Đọc để có cái nhìn tổng thể về kiến trúc, luồng dữ liệu, API, database, security và phases triển khai.

### 9. API Roles & Permissions

```txt
API_ROLES.md
```

Nguồn duy nhất tổng hợp danh sách Backend API (`/api/v1/**`), method, path, role
được phép truy cập và tham số lọc/phân trang.

### 10. BE-09 Admin Teacher Management Design

```txt
BE09_TEACHER_MANAGEMENT_DESIGN.md
```

Thiết kế chi tiết cho bộ API quản lý Teacher của Admin, bao gồm tạo đơn lẻ,
tạo hàng loạt, cập nhật, activate/deactivate và reset password.


### 11. Kế Hoạch Lịch Sử Hỏi Đáp Và Resume Chat AI

```txt
13_RAG_CHAT_HISTORY_RESUME_PLAN.md
```

Tài liệu riêng để bắt đầu implement tính năng resume lại cuộc hội thoại với AI và xem lịch sử hỏi đáp.
Tài liệu này chia rõ task cho Frontend, Backend và AI Service.

### 12. Kế Hoạch Triển Khai Admin Quản Lý Giảng Viên

```txt
14_ADMIN_TEACHER_MANAGEMENT_IMPLEMENTATION_PLAN.md
```

Tài liệu riêng để triển khai bản đơn giản của tính năng Admin xem danh sách giảng viên,
thông tin giảng viên và thống kê tài liệu đã upload. Tài liệu này chia task rõ cho Backend
và Frontend; AI Service không cần sửa trong phạm vi V1.

## 3. Quyết định đã khóa

- Document là trung tâm của hệ thống.
- Giảng viên là actor chính.
- Subject/topic/chapter/tags chỉ là metadata của Document.
- Không bắt Teacher tạo Course/Lecture trước khi upload.
- Hệ thống có một Admin duy nhất.
- Admin kiểm duyệt/công bố tài liệu và quản lý tài khoản Teacher ở mức cơ bản.
- Không triển khai Student flow trong core MVP.
- ID nghiệp vụ mục tiêu dùng `BIGINT/Long`.
- Upload tự động kích hoạt AI processing.
- Dùng hai cột riêng: `processing_status` và `publication_status`.
- `storage_key` có version:
  `documents/{document_id}/{version}/source.{extension}`.
- RAG nhận `document_ids`; không retrieval toàn thư viện trong MVP.
- Summary và question generation là Should-have.
- Quản lý tài khoản Teacher là Should-have, không chặn core demo.

## 4. Thứ tự ưu tiên khi có xung đột

1. `01_PROJECT_PRD.md` quyết định phạm vi và nghiệp vụ.
2. `04_AI_API_CONTRACT.md` quyết định payload HTTP Backend - AI.
3. `05_DATABASE_SCHEMA.md` quyết định database schema.
4. `03_BE_AI_INTEGRATION.md` quyết định ownership và kiến trúc tích hợp.
5. `06_AI_PIPELINE.md` quyết định thuật toán AI.
6. `07_BACKEND_DATABASE_SCHEMA_GUIDE.md` hướng dẫn Backend tạo migration database đầy đủ.
7. `02_MVP_IMPLEMENTATION_PLAN.md` quyết định thứ tự thi công.
8. Code phải được sửa để khớp bộ tài liệu đã chốt.

## 5. Tài liệu cá nhân, không phải contract

Các file sau không dùng làm nguồn triển khai chung:

```txt
AI_LEARNING_LOG.md
AI_PROGRESS_PRESENTATION_2026-07-04.md
baocao.md
GROUP_AND_PERSONAL_REPORT_2026-06-28.md
WBS - LMS.xlsx
```

## 6. Quy trình thay đổi

1. Thành viên đề xuất thay đổi và chỉ rõ file canonical bị ảnh hưởng.
2. Nhóm chốt quyết định.
3. Cập nhật file sở hữu quyết định đó.
4. Cập nhật file liên quan bằng liên kết, không sao chép lại toàn bộ nội dung.
5. Review docs và implementation trong cùng pull request hoặc docs trước code.