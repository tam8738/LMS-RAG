# Bộ tài liệu chính thức của dự án

**Phiên bản:** 1.4
**Cập nhật:** 07/07/2026
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
05_DATABASE_SCHEMA_CONTRACT.md
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
- Dùng ba cột riêng: `processing_status`, `publication_status` và `rag_status`.
- `storage_key` có version:
  `documents/{document_id}/{version}/source.{extension}`.
- RAG nhận `document_ids`; không retrieval toàn thư viện trong MVP.
- Summary và question generation là Should-have.
- Quản lý tài khoản Teacher là Should-have, không chặn core demo.

## 4. Thứ tự ưu tiên khi có xung đột

1. `01_PROJECT_PRD.md` quyết định phạm vi và nghiệp vụ.
2. `04_AI_API_CONTRACT.md` quyết định payload HTTP Backend - AI.
3. `05_DATABASE_SCHEMA_CONTRACT.md` quyết định database schema, bao gồm `rag_status` và migration V4.
4. `03_BE_AI_INTEGRATION.md` quyết định ownership và kiến trúc tích hợp analyze/index.
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
## Cập nhật REF-01 - Luồng analyze/index mới

Luồng MVP mới được chốt:

```txt
Teacher upload
-> Backend lưu file
-> AI analyze nhẹ
-> processing_status = PROCESSED
-> rag_status = READY_TO_INDEX hoặc UNSUPPORTED
-> Teacher submit review
-> Admin approve
-> Nếu READY_TO_INDEX: Backend gọi AI index-document, rag_status = READY
-> Nếu UNSUPPORTED: publish như tài liệu thường, không có RAG AI
```

Đọc các file sau khi implement REF-01:

1. `01_PROJECT_PRD.md` để hiểu scope nghiệp vụ.
2. `03_BE_AI_INTEGRATION.md` để hiểu luồng BE-AI.
3. `04_AI_API_CONTRACT.md` để implement payload analyze/index/RAG.
4. `05_DATABASE_SCHEMA_CONTRACT.md` và `07_BACKEND_DATABASE_SCHEMA_GUIDE.md` để tạo migration V4.
5. `02_MVP_IMPLEMENTATION_PLAN.md` để chia task cho BE/AI/FE.