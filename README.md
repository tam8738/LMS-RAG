# LMS-RAG

Hệ thống quản lý tài liệu học liệu và hỗ trợ hỏi đáp theo tài liệu bằng RAG cho giảng viên ngành CNTT.

## Định hướng hiện tại

Core MVP tập trung vào luồng document-centric:

```txt
Teacher login
-> upload PDF/TXT
-> nhập metadata subject/topic/chapter/tags
-> Backend tạo Document và job xử lý
-> AI analyze tài liệu
-> Teacher submit review
-> Admin approve
-> AI index chunks/vector
-> document xuất hiện trong Library
-> Teacher hỏi đáp AI theo tài liệu
-> answer có citation và resume được lịch sử chat
```

Dự án không phát triển như một LMS đầy đủ trong core MVP. Không bắt buộc tạo Course/Lecture trước khi upload. `subject`, `topic`, `chapter`, `tags` chỉ là metadata của `Document`.

Không thuộc core MVP hiện tại:

- Student flow.
- Quiz attempt/result và xếp hạng sinh viên.
- Gamification.
- Course/Lecture LMS flow.
- Dashboard thống kê phức tạp.
- RAG toàn thư viện không giới hạn scope.

AI Service và Backend đã hỗ trợ sinh, lưu, xem, chỉnh sửa draft và công bố quiz từ tài liệu. Giao diện
Teacher review/publish cùng luồng Student làm bài/attempt/result chưa được triển khai.

## Thành phần

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Frontend | React + Vite | Auth, Library, My Documents, Upload, Admin Review, RAG chat UI, citation UI |
| Backend | Spring Boot | JWT, phân quyền, upload, review, Library, RAG, chat history, quiz, quản lý Teacher |
| AI Service | FastAPI | Parse, clean, chunk, embedding, retrieval, grounded answer/citation, sinh quiz draft |
| Database | PostgreSQL + pgvector | Dữ liệu nghiệp vụ/quiz, chunks/vector, lịch sử hội thoại RAG |
| Docker | Docker Compose | Chạy Postgres, Backend, AI Service, pgAdmin và shared upload volume |

## Tài liệu chính thức

Bắt đầu tại:

```txt
docs/00_DOCS_INDEX.md
```

Thứ tự đọc khuyến nghị:

```txt
docs/00_DOCS_INDEX.md
docs/01_PROJECT_PRD.md
docs/02_MVP_IMPLEMENTATION_PLAN.md
docs/03_BE_AI_INTEGRATION.md
docs/04_AI_API_CONTRACT.md
docs/05_DATABASE_SCHEMA_CONTRACT.md
docs/06_AI_PIPELINE.md
docs/API_ROLES.md
docs/15_QUIZ_API_BACKEND_SPEC.md
```

Báo cáo tiến độ gửi giáo viên hướng dẫn nằm tại:

```txt
PROJECT_PROGRESS_REPORT.md
```

## Cấu trúc repository

```txt
backend/       Spring Boot API
frontend/      React + Vite UI
ai-service/    FastAPI AI Service
docs/          Tài liệu dự án và implementation plans
scripts/       Checklist/test notes hỗ trợ tích hợp
```

## Trạng thái hiện tại

Backend:

- Đã có JWT access/refresh token, rotate/revoke refresh token, logout blacklist và phân quyền Teacher/Admin.
- Đã có API hồ sơ cá nhân, đổi mật khẩu và quản lý Teacher cho Admin.
- Đã có upload tài liệu, My Documents, Admin review, Library, file content/download.
- Đã có RAG proxy và persisted RAG conversation history.
- Đã có 4 API Teacher sinh/xem/sửa/publish quiz, lưu `quizzes`/`quiz_questions` bằng migration V14.
- Đã có 7 API Admin quản lý Teacher: list, create, batch create, update, activate, deactivate và reset password.

Frontend:

- Đã có ứng dụng React/Vite với các màn auth, library, my documents, upload, admin review và RAG chat.
- RAG chat đã có resume lịch sử, clear history, citation display và trạng thái not-found.
- Một số API hồ sơ người dùng vẫn cần đồng bộ với Backend nếu tiếp tục giữ màn profile/change password.

AI Service:

- Đã có analyze/index document, parse PDF/TXT, chunk/embedding, retrieval theo `document_ids`.
- Đã có grounded LLM answer generation sau retrieval, hỗ trợ history stateless và citation từ chunk thật.
- Đã có API nội bộ `/v1/generate-quiz` để sinh quiz draft từ tài liệu đã index; Backend đã nối gọi,
  kiểm tra response, lưu draft và quản lý publish. Phần giao diện/làm quiz vẫn thuộc FE và student flow sau này.

Môi trường:

- `docker-compose.yml` chạy Postgres + pgvector, Backend, AI Service và pgAdmin.
- Frontend chạy riêng bằng Vite trong thư mục `frontend`.

## Chạy nhanh local

Backend, AI Service và database:

```powershell
docker compose up -d postgres backend ai-service
```

Chỉ bật pgAdmin khi cần quản trị database:

```powershell
docker compose --profile tools up -d pgadmin
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Build/test cơ bản:

```powershell
cd frontend
npm run build

cd ../backend
./mvnw test

cd ../ai-service
pytest
```

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
feat(ai): add quiz generation endpoint
feat(frontend): add quiz publish flow
docs: update project progress report
test(e2e): verify document publication and rag chat
```
