# Tài liệu dùng chung của nhóm

**Cập nhật:** 03/07/2026

## 1. Mục đích

File này chỉ rõ các tài liệu kỹ thuật được dùng chung giữa Backend và AI Service.

## 2. Thứ tự ưu tiên

### 1. PRD v1.1

```txt
PRD_RAG_Lecture_Assistant_v1_1_updated_after_advisor.md
```

Nguồn yêu cầu nghiệp vụ và phạm vi MVP.

### 2. Quyết định tích hợp Backend - AI

```txt
BE_AI_INTEGRATION_DECISIONS.md
```

Nguồn quyết định kiến trúc đã chốt:

- ID Long.
- Shared volume + storage key.
- Backend quản lý job/status.
- AI xử lý đồng bộ.
- `/v1` prefix.
- Internal API key.
- JSON response envelope.
- JSON RAG trước, SSE sau.

### 3. AI Service contract

```txt
AI_SERVICE_CONTRACT_V1_1_SHARED.md
```

Nguồn request/response chính thức giữa Backend và AI.

### 4. Database agreement

```txt
BE_AI_DATABASE_SCHEMA_AGREEMENT.md
```

Nguồn schema/migration cần Backend triển khai cho:

- `documents`
- `document_processing_jobs`
- `document_chunks`
- pgvector/index/cascade
- citations/question source

### 5. AI pipeline

```txt
AI_PIPELINE_V1_1_SHARED.md
```

Nguồn mô tả luồng parse, clean, chunk, embedding, persistence và retrieval.

## 3. Quy tắc khi có xung đột

Khi tài liệu cũ khác với các file trên:

1. PRD v1.1 quyết định phạm vi nghiệp vụ.
2. `BE_AI_INTEGRATION_DECISIONS.md` quyết định kiến trúc tích hợp.
3. `AI_SERVICE_CONTRACT_V1_1_SHARED.md` quyết định payload HTTP.
4. `BE_AI_DATABASE_SCHEMA_AGREEMENT.md` quyết định schema liên quan AI.
5. Code phải được sửa để khớp tài liệu đã chốt.

File `API_Contract_LMS_RAG.docx.pdf` ngày 20/06/2026 là tài liệu nền. Các điểm liên quan Backend - AI đã được điều chỉnh bởi bộ tài liệu ngày 03/07/2026.

## 4. Tài liệu không dùng làm contract chung

Các file sau có thể là ghi chú học tập, báo cáo hoặc bản cũ; không dùng làm nguồn triển khai nếu chưa được nhóm xác nhận:

```txt
AI_LEARNING_LOG.md
GROUP_AND_PERSONAL_REPORT_2026-06-28.md
BACKEND_TAM_AUTH_PROGRESS_REVIEW_2026-06-28.md
BACKEND_SCHEMA_FEEDBACK_FOR_AI.md
AI_SERVICE_CONTRACT.md
AI_PIPELINE.md
PRD_RAG_Lecture_Assistant_v1.md
WBS - LMS.xlsx
```

## 5. Quy trình thay đổi contract

Khi Backend hoặc AI muốn đổi contract:

1. Trao đổi và chốt giữa hai bên.
2. Cập nhật `BE_AI_INTEGRATION_DECISIONS.md` nếu thay đổi kiến trúc.
3. Cập nhật contract/schema/pipeline liên quan.
4. Review pull request.
5. Merge docs trước hoặc cùng implementation.
6. Không tự thay đổi request/response chỉ trong code.

