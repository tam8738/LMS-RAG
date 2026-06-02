# LMS-RAG — RAG Lecture Assistant

## Giới thiệu

LMS-RAG là hệ thống quản lý tài liệu bài giảng và hỗ trợ học tập sử dụng Retrieval-Augmented Generation (RAG).

Hệ thống hỗ trợ:

* Teacher/Admin quản lý course và lecture
* Upload tài liệu PDF/TXT
* AI xử lý tài liệu và tạo embeddings
* Student hỏi đáp theo nội dung bài giảng
* Sinh summary và quiz bằng AI
* Student làm quiz và xem kết quả

---

# Công nghệ sử dụng

| Thành phần     | Công nghệ             |
| -------------- | --------------------- |
| Frontend       | React + Vite          |
| Backend        | Spring Boot           |
| AI Service     | FastAPI               |
| Database       | PostgreSQL            |
| Vector Search  | pgvector              |
| Authentication | Spring Security + JWT |
| AI API         | OpenAI API            |
| API Style      | REST API              |

---

# Kiến trúc hệ thống

```txt
Frontend (React)
       |
       v
Backend (Spring Boot)
       |
       +---- PostgreSQL
       |
       +---- AI Service (FastAPI)
                    |
                    +---- OpenAI API
                    |
                    +---- pgvector
```

---

# Cấu trúc project

```txt
LMS-RAG/
│
├── backend/          # Spring Boot API
├── frontend/         # React + Vite UI
├── ai-service/       # FastAPI + RAG
├── docs/             # Tài liệu đồ án
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# Thành viên nhóm

| Vai trò    | Công việc                              |
| ---------- | -------------------------------------- |
| Backend    | Spring Boot, PostgreSQL, JWT, REST API |
| Frontend   | React UI/UX                            |
| AI Service | FastAPI, RAG, OpenAI, pgvector         |

---

# Clone project

```bash
git clone -b develop https://github.com/tam8738/LMS-RAG.git
```

Di chuyển vào project:

```bash
cd LMS-RAG
```

---

# Git Flow Convention

Repository sử dụng Git Flow với cấu trúc branch:

```txt
main
develop
feature/*
release/*
hotfix/*
```

| Branch      | Vai trò                         |
| ----------- | ------------------------------- |
| `main`      | Source code ổn định để demo/nộp |
| `develop`   | Nhánh tích hợp chung            |
| `feature/*` | Nhánh phát triển chức năng      |
| `release/*` | Chuẩn bị release/demo           |
| `hotfix/*`  | Sửa lỗi khẩn cấp                |

---

# Khởi tạo Git Flow trên máy thành viên

Mỗi thành viên sau khi clone cần chạy:

```bash
git flow init
```

Sau đó Enter theo mặc định:

```txt
Production branch: main
Development branch: develop
Feature prefix: feature/
Release prefix: release/
Hotfix prefix: hotfix/
```

---

# Quy trình làm việc với Git Flow

## 1. Chuyển sang develop

```bash
git checkout develop
git pull origin develop
```

---

## 2. Tạo feature branch

Ví dụ:

```bash
git flow feature start backend-init
```

Git sẽ tạo:

```txt
feature/backend-init
```

---

## 3. Commit code

```bash
git add .
git commit -m "feat(backend): initialize spring boot maven project"
```

---

## 4. Push branch

```bash
git push -u origin feature/backend-init
```

---

## 5. Tạo Pull Request

```txt
feature/backend-init → develop
```

---

# Quy ước đặt tên branch

```txt
feature/<module>-<task>
```

Ví dụ:

```txt
feature/auth-jwt
feature/course-api
feature/upload-document
feature/rag-chat
feature/summary-workflow
feature/quiz-workflow
feature/frontend-layout
```

---

# Quy ước commit message

Format:

```txt
<type>(<module>): <description>
```

## Các type sử dụng

| Type     | Ý nghĩa            |
| -------- | ------------------ |
| feat     | Thêm chức năng     |
| fix      | Sửa lỗi            |
| refactor | Refactor code      |
| docs     | Cập nhật tài liệu  |
| test     | Thêm/sửa test      |
| chore    | Công việc cấu hình |

---

# Ví dụ commit

```bash
feat(auth): implement login API
feat(course): add course CRUD
feat(chat): integrate rag answer service
fix(upload): validate pdf file type
docs(readme): update setup guide
chore(docker): add postgres container
```

---

# Backend Setup

## Chạy PostgreSQL bằng Docker

```bash
docker compose up -d
```

---

## Chạy Spring Boot

```bash
cd backend
./mvnw spring-boot:run
```

Backend chạy tại:

```txt
http://localhost:8080
```

Swagger UI:

```txt
http://localhost:8080/swagger-ui/index.html
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại:

```txt
http://localhost:5173
```

---

# AI Service Setup

## Tạo virtual environment

```bash
cd ai-service
python -m venv venv
```

Activate environment:

### Git Bash

```bash
source venv/Scripts/activate
```

### PowerShell

```powershell
.\venv\Scripts\Activate.ps1
```

---

## Cài dependencies

```bash
pip install fastapi uvicorn openai psycopg2-binary pgvector python-dotenv
```

---

## Chạy FastAPI

```bash
uvicorn app.main:app --reload
```

AI Service chạy tại:

```txt
http://localhost:8000
```

---

# Docker Compose

```yaml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: lms-rag-postgres
    restart: always
    environment:
      POSTGRES_DB: lms_rag
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 123456
    ports:
      - "5432:5432"

  pgadmin:
    image: dpage/pgadmin4
    container_name: lms-rag-pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@gmail.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
```

---

# Environment Variables

## Backend

```env
SPRING_DATASOURCE_URL=
SPRING_DATASOURCE_USERNAME=
SPRING_DATASOURCE_PASSWORD=
JWT_SECRET=
```

## AI Service

```env
OPENAI_API_KEY=
DATABASE_URL=
```

---

# Phạm vi MVP

* Authentication & Authorization
* Course/Lecture Management
* Document Upload & Processing
* RAG Question Answering
* AI Summary Generation
* AI Quiz Generation
* Quiz Attempt & Result

---

# Tài liệu dự án

Tài liệu nằm trong:

```txt
/docs
```

Bao gồm:

* SRS
* ERD
* API Documentation
* WBS
* Báo cáo đồ án
