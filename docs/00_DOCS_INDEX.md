# Bộ tài liệu chính thức của dự án

**Phiên bản:** 1.5
**Cập nhật:** 21/07/2026
**Đối tượng đọc:** Frontend, Backend, AI Service

## 1. Mục đích

Đây là mục lục dùng chung của bộ tài liệu dự án. Mỗi file sở hữu một nhóm quyết định riêng để tránh lặp, tránh mâu thuẫn và giúp thành viên mới đọc đúng thứ tự.

Khi tài liệu và code không thống nhất, cần ưu tiên kiểm tra code thực tế, sau đó cập nhật lại file contract/plan tương ứng.

## 2. Thứ tự đọc khuyến nghị

### 1. PRD

```txt
01_PROJECT_PRD.md
```

Đọc để hiểu vấn đề, actor, phạm vi MVP, luồng nghiệp vụ và tiêu chí hoàn thành.

### 2. Kế hoạch triển khai MVP

```txt
02_MVP_IMPLEMENTATION_PLAN.md
```

Đọc để biết task graph, owner, trạng thái tracking, public API tối thiểu, handoff, test gate và thứ tự thực hiện.

### 3. Quyết định tích hợp Backend - AI

```txt
03_BE_AI_INTEGRATION.md
```

Đọc để hiểu ranh giới trách nhiệm giữa Backend và AI Service, shared storage, auto-processing, status và internal API.

### 4. AI API contract

```txt
04_AI_API_CONTRACT.md
```

Nguồn chính cho endpoint, request, response và error giữa Backend và AI Service.

### 5. Database schema contract

```txt
05_DATABASE_SCHEMA_CONTRACT.md
```

Nguồn chính cho schema database của Document MVP: `users`, `documents`, jobs, chunks/vector và RAG chat history.

### 6. Backend database guide

```txt
07_BACKEND_DATABASE_SCHEMA_GUIDE.md
```

Đọc khi Backend tạo hoặc kiểm tra migration database chi tiết.

### 7. AI pipeline

```txt
06_AI_PIPELINE.md
```

Đọc để hiểu thuật toán parse, clean, chunk, embedding, retrieval, grounded answer generation và citation.

### 8. Thiết kế hệ thống tổng quan

```txt
08_SYSTEM_DESIGN.md
```

Đọc để có cái nhìn tổng thể về kiến trúc, luồng dữ liệu, API, database, security và scope triển khai.

### 9. API roles và permissions

```txt
API_ROLES.md
```

Nguồn tổng hợp các Backend API `/api/v1/**`, method, path, role được phép truy cập và tham số lọc/phân trang.

### 10. RAG chat history/resume

```txt
13_RAG_CHAT_HISTORY_RESUME_PLAN.md
```

Tài liệu riêng cho tính năng lưu lịch sử hỏi đáp, resume chat và clear history theo từng user + document.

### 11. Admin quản lý giảng viên

```txt
14_ADMIN_TEACHER_MANAGEMENT_IMPLEMENTATION_PLAN.md
BE09_TEACHER_MANAGEMENT_DESIGN.md
```

Tài liệu thiết kế/plan cho bản đơn giản của tính năng Admin xem danh sách giảng viên, xem thống kê tài liệu đã upload và quản lý trạng thái tài khoản Teacher.

### 12. Báo cáo tiến độ

```txt
../PROJECT_PROGRESS_REPORT.md
```

Báo cáo tiến độ tổng hợp để gửi giáo viên hướng dẫn. File này không phải API/schema contract nhưng phản ánh trạng thái dự án tại thời điểm kiểm tra.

## 3. Quyết định đã khóa

- `Document` là trung tâm của hệ thống.
- Giảng viên là actor chính trong core MVP.
- `subject`, `topic`, `chapter`, `tags` chỉ là metadata của Document.
- Không bắt Teacher tạo Course/Lecture trước khi upload.
- Core MVP không triển khai Student flow.
- Admin kiểm duyệt/công bố tài liệu và có thể quản lý tài khoản Teacher ở mức cơ bản.
- Upload tự động kích hoạt AI analyze.
- Admin approve kích hoạt AI index RAG.
- Dùng hai trạng thái riêng: `processing_status` và `publication_status`.
- `storage_key` có version: `documents/{document_id}/{version}/source.{extension}`.
- RAG nhận `document_ids`; AI không tự kiểm quyền và không retrieval toàn thư viện trong MVP.
- Backend là source of truth cho RAG conversation history; AI Service chỉ nhận `history` stateless.
- Grounded LLM answer chỉ được sinh sau khi retrieval có context phù hợp.
- Sinh quiz từ tài liệu là phần cần làm tiếp, chưa phải luồng hoàn thiện trong code hiện tại.

## 4. Thứ tự ưu tiên khi có xung đột

1. `01_PROJECT_PRD.md` quyết định phạm vi và nghiệp vụ.
2. `04_AI_API_CONTRACT.md` quyết định payload HTTP Backend - AI.
3. `05_DATABASE_SCHEMA_CONTRACT.md` quyết định database schema.
4. `03_BE_AI_INTEGRATION.md` quyết định ownership và kiến trúc tích hợp.
5. `06_AI_PIPELINE.md` quyết định thuật toán AI.
6. `API_ROLES.md` tổng hợp endpoint và role truy cập Backend.
7. `02_MVP_IMPLEMENTATION_PLAN.md` quyết định tracking và thứ tự thi công.
8. Code thực tế là nguồn kiểm chứng cuối cùng khi cần báo cáo tiến độ.

## 5. Tài liệu legacy hoặc không phải contract

Các file học tập, ghi chú cá nhân, báo cáo cũ hoặc test-case theo scope cũ không dùng làm nguồn triển khai chính. Nếu cần giữ lại để tham khảo, file phải ghi rõ trạng thái legacy.

Ví dụ:

```txt
AI_LEARNING_LOG.md
LMS-RAG-Backend-Test-Cases.md
BACKEND_CHANGES_*.md
frontend/TODO_DEVELOPMENT_PLAN.md
```

## 6. Quy trình thay đổi docs

1. Xác định file canonical bị ảnh hưởng.
2. Cập nhật đúng file sở hữu quyết định đó.
3. Nếu thay đổi ảnh hưởng API/schema/flow, cập nhật thêm plan hoặc index liên quan.
4. Không copy dài nội dung giữa nhiều file; ưu tiên link qua file chính.
5. Review docs cùng code hoặc cập nhật docs ngay sau khi code đổi.