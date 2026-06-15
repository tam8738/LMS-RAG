# AI Service

AI Service là service FastAPI phụ trách các chức năng AI trong hệ thống LMS RAG Lecture Assistant:

- Xử lý tài liệu PDF/TXT.
- Làm sạch và chia nhỏ nội dung tài liệu.
- Sinh embedding.
- Lưu và truy vấn vector bằng PostgreSQL/pgvector.
- Trả lời câu hỏi bằng RAG.
- Sinh summary bài giảng.
- Sinh quiz ôn tập.

## Yêu cầu môi trường

- Python 3.11+.
- PostgreSQL/pgvector chạy bằng Docker Compose của project.
- File `.env` được tạo từ `.env.example`.
- `OPENAI_API_KEY` chỉ bắt buộc khi chạy các chức năng gọi OpenAI thật.

## Cài đặt local

Di chuyển vào thư mục AI Service:

```powershell
cd ai-service
```

Tạo virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Cài dependencies:

```powershell
pip install -r requirements.txt
```

Tạo file `.env` từ `.env.example`:

```powershell
Copy-Item .env.example .env
```

Nếu cần gọi OpenAI thật, điền `OPENAI_API_KEY` trong file `.env`.

## Cấu hình database

Mặc định AI Service kết nối PostgreSQL qua:

```txt
postgresql://postgres:123456@localhost:5432/lms_rag
```

Biến môi trường tương ứng:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/lms_rag
DB_CONNECT_TIMEOUT=5
```

PostgreSQL/pgvector được chạy từ thư mục root project:

```powershell
cd ..
docker compose up -d postgres
```

## Chạy FastAPI

Từ thư mục `ai-service`, chạy:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```txt
GET http://localhost:8000/health
```

Swagger UI:

```txt
http://localhost:8000/docs
```

## Kiểm tra pgvector

Sau khi PostgreSQL/pgvector đã chạy, kiểm tra bằng script:

```powershell
python scripts/check_pgvector.py
```

Kết quả thành công mẫu:

```txt
pgvector check ok
database: lms_rag
pgvector extension: 0.8.2
sample id: 1
nearest label: sample
distance: 0.010000
```

Có thể kiểm tra qua API khi FastAPI đang chạy:

```txt
GET http://localhost:8000/health/pgvector
```

## Xử lý lỗi thường gặp

Nếu script báo timeout khi kết nối PostgreSQL:

```txt
connection timeout expired
```

hãy kiểm tra PostgreSQL container đã chạy chưa:

```powershell
docker compose ps
```

Nếu Docker báo port `5432` đã bị chiếm:

```txt
Bind for 0.0.0.0:5432 failed: port is already allocated
```

hãy dừng PostgreSQL/container khác đang dùng port `5432`, sau đó chạy lại:

```powershell
docker compose up -d postgres
```

## Ghi chú triển khai

- AI Service không xử lý xác thực hoặc phân quyền người dùng.
- Frontend không gọi trực tiếp AI Service.
- Backend kiểm tra quyền truy cập trước, sau đó gọi AI Service qua REST API.
- Endpoint `/health/pgvector` chỉ dùng để kiểm tra môi trường phát triển; khi triển khai thật có thể giới hạn nội bộ hoặc tắt endpoint này.

