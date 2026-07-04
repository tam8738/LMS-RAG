# Bộ tài liệu chính thức của dự án

**Phiên bản:** 1.2
**Cập nhật:** 04/07/2026
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

Đọc để biết hiện trạng code, task FE/BE/AI, dependency, test, branch và thứ tự
thực hiện.

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

### 6. AI pipeline

```txt
06_AI_PIPELINE.md
```

Đọc để hiểu thuật toán xử lý tài liệu, retrieval, RAG, citation và test AI.

## 3. Quyết định đã khóa

- Quản lý tài liệu và thư viện dùng chung là trọng tâm.
- Giảng viên là actor chính.
- Admin là actor phụ, chỉ kiểm duyệt/công bố tài liệu.
- Không triển khai Student flow trong core MVP.
- ID nghiệp vụ mục tiêu dùng `BIGINT/Long`.
- Upload tự động kích hoạt AI processing.
- Dùng hai cột riêng: `processing_status` và `publication_status`.
- `storage_key` có version:
  `documents/{document_id}/{version}/source.{extension}`.
- RAG nhận `document_ids`; không retrieval toàn thư viện trong MVP.
- Summary và question generation là Should-have.

## 4. Thứ tự ưu tiên khi có xung đột

1. `01_PROJECT_PRD.md` quyết định phạm vi và nghiệp vụ.
2. `04_AI_API_CONTRACT.md` quyết định payload HTTP Backend - AI.
3. `05_DATABASE_SCHEMA.md` quyết định database schema.
4. `03_BE_AI_INTEGRATION.md` quyết định ownership và kiến trúc tích hợp.
5. `06_AI_PIPELINE.md` quyết định thuật toán AI.
6. `02_MVP_IMPLEMENTATION_PLAN.md` quyết định thứ tự thi công.
7. Code phải được sửa để khớp bộ tài liệu đã chốt.

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
