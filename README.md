# LMS-RAG
## Giới thiệu

RAG Lecture Assistant là hệ thống hỗ trợ quản lý tài liệu bài giảng và hỗ trợ học tập cho ngành Công nghệ Thông tin bằng kỹ thuật Retrieval-Augmented Generation (RAG).

Hệ thống cho phép:

* Teacher/Admin quản lý course và lecture
* Upload tài liệu PDF/TXT
* AI xử lý tài liệu và tạo embeddings
* Student hỏi đáp theo nội dung bài giảng
* Sinh summary và quiz bằng AI
* Student làm quiz và xem kết quả

---

# Công nghệ sử dụng

| Thành phần      | Công nghệ             |
| --------------- | --------------------- |
| Frontend        | React + Vite          |
| Backend         | Spring Boot           |
| AI Service      | FastAPI               |
| Database        | PostgreSQL            |
| Vector Database | pgvector              |
| Authentication  | Spring Security + JWT |
| AI API          | OpenAI API            |
| API Style       | REST API              |

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

# Chức năng chính

## Teacher/Admin

* Đăng nhập hệ thống
* Tạo và quản lý course
* Tạo lecture
* Upload tài liệu
* Sinh summary bằng AI
* Sinh quiz bằng AI
* Publish summary và quiz

## Student

* Tham gia course bằng mã lớp
* Xem lecture
* Xem summary
* Hỏi đáp RAG theo bài giảng
* Làm quiz
* Xem kết quả quiz

---

# Cấu trúc thư mục

```txt
backend/        Spring Boot API
frontend/       React + Vite UI
ai-service/     FastAPI + OpenAI + RAG
docs/           Tài liệu dự án
```

---

# Cách chạy project

## 1. Clone repository

```bash
git clone https://github.com/<your-username>/rag-lecture-assistant.git
```

---

# Backend

## Chạy PostgreSQL

```bash
docker compose up -d postgres
```

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

# Frontend

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

# AI Service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload
```

AI Service chạy tại:

```txt
http://localhost:8000
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

# Quy ước branch

```txt
feature/<module>-<task>
bugfix/<module>-<task>
docs/<task>
```

Ví dụ:

```txt
feature/auth-login
feature/rag-chat
bugfix/upload-error
```

---

# Quy ước commit

```txt
feat(auth): implement login API
feat(course): add course CRUD
fix(upload): validate file type
docs(readme): update setup guide
```

---

# Thành viên nhóm

| Vai trò    | Công việc                         |
| ---------- | --------------------------------- |
| Backend    | Spring Boot, PostgreSQL, JWT, API |
| Frontend   | React UI/UX                       |
| AI Service | FastAPI, RAG, OpenAI, pgvector    |

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

# Tài liệu

Các tài liệu dự án nằm trong thư mục:

```txt
/docs
```

Bao gồm:

* SRS
* ERD
* API Documentation
* WBS
* Báo cáo đồ án
