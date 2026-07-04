# LMS-RAG

Hệ thống quản lý tài liệu và hỗ trợ giảng dạy sử dụng RAG cho giảng viên ngành CNTT.

## Định hướng

Core MVP tập trung vào:

```txt
Teacher login
-> upload PDF/TXT
-> Backend tạo Document/job
-> AI tạo chunks/vector
-> Teacher submit review
-> Admin approve
-> document xuất hiện trong Library
-> Teacher khác hỏi RAG
-> answer có citation
```

Không triển khai Student flow, quiz attempt/result, gamification hoặc dashboard phức tạp trong core MVP. Summary và question generation là Should-have.

## Thành phần

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Frontend | React + Vite | Library, My Documents, Admin Review, RAG UI |
| Backend | Spring Boot | JWT, permission, upload, jobs, review, Library |
| AI Service | FastAPI | Parse, chunk, embedding, retrieval, RAG |
| Database | PostgreSQL + pgvector | Nghiệp vụ và vector storage |

## Tài liệu chính thức

Bắt đầu tại:

```txt
docs/00_DOCS_INDEX.md
```

Thứ tự đọc:

```txt
00_DOCS_INDEX.md
01_PROJECT_PRD.md
02_MVP_IMPLEMENTATION_PLAN.md
03_BE_AI_INTEGRATION.md
04_AI_API_CONTRACT.md
05_DATABASE_SCHEMA.md
06_AI_PIPELINE.md
```

Các file học tập, WBS và báo cáo cá nhân không phải contract triển khai.

## Cấu trúc repository

```txt
backend/       Spring Boot API
frontend/      React UI
ai-service/    FastAPI AI Service
docs/          Tài liệu dự án
```

## Trạng thái hiện tại

Backend:

- Đã có login JWT và entity nền.
- Chưa có Document/upload/review/Library/RAG proxy.

Frontend:

- Chưa có source ứng dụng.

AI Service:

- Đã có document processing pipeline và `/v1/process-document`.
- Chưa có retrieval/RAG endpoint E2E.

Chi tiết và thứ tự triển khai nằm trong `docs/02_MVP_IMPLEMENTATION_PLAN.md`.

## Quy ước Git

Branches chính:

```txt
main
develop
feature/*
```

Commit:

```txt
<type>(<module>): <description>
```

Ví dụ:

```txt
feat(backend): add document upload
feat(ai): add document retrieval
feat(frontend): add library screen
test(e2e): verify publication and rag flow
```
