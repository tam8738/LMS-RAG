# AI Service

AI Service là service FastAPI phụ trách các chức năng AI trong hệ thống quản lý tài liệu và hỗ trợ giảng dạy sử dụng RAG:

- Xử lý tài liệu PDF/TXT.
- Làm sạch và chia nhỏ nội dung tài liệu.
- Sinh embedding.
- Lưu và truy vấn vector bằng PostgreSQL/pgvector.
- Trả lời câu hỏi bằng RAG.
- Sinh summary tài liệu.
- Sinh câu hỏi gợi ý từ tài liệu.

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

Cài dependencies phục vụ test trong môi trường phát triển:

```powershell
pip install -r requirements.txt -r requirements-dev.txt
```

Tạo file `.env` từ `.env.example`:

```powershell
Copy-Item .env.example .env
```

Điền `OPENAI_API_KEY` để sinh embedding thật và đặt cùng giá trị `INTERNAL_API_KEY` với Backend.

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
GET http://localhost:8000/v1/health
```

Swagger UI:

```txt
http://localhost:8000/docs
```

## Chạy bằng Docker

Build image từ thư mục `ai-service`:

```powershell
docker build -t lms-rag-ai-service .
```

Chạy container standalone để kiểm tra health endpoint:

```powershell
docker run --rm -p 8000:8000 `
  -e APP_ENV=docker `
  -e INTERNAL_API_KEY=dev-internal-secret `
  lms-rag-ai-service
```

Health check của image gọi `GET /v1/health`. Các endpoint nghiệp vụ vẫn cần cấu hình thêm `DATABASE_URL`, `UPLOAD_ROOT`, `OPENAI_API_KEY` và `INTERNAL_API_KEY` giống Backend.

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

Có thể kiểm tra qua API khi FastAPI đang chạy. Endpoint này yêu cầu secret giống Backend:

```powershell
$headers = @{ "X-Internal-Key" = "your-internal-secret" }
Invoke-RestMethod `
  -Uri "http://localhost:8000/v1/health/pgvector" `
  -Headers $headers
```

## Xử lý học liệu

Backend gọi endpoint nội bộ:

```txt
POST http://localhost:8000/v1/process-document
X-Internal-Key: your-internal-secret
```

Payload mẫu:

```json
{
  "document_id": 12,
  "storage_key": "documents/12/v1/source.pdf",
  "file_type": "PDF",
  "reprocess": false,
  "metadata": {
    "subject": "Cơ sở dữ liệu",
    "topic": "Chuẩn hóa dữ liệu",
    "chapter": "Chương 3",
    "tags": ["database", "normalization"]
  }
}
```

AI Service xử lý đồng bộ theo luồng:

```txt
resolve -> validate -> parse -> clean -> chunk -> embed -> transaction replace
```

PDF parser hiện sử dụng PyMuPDF để trích text theo vị trí glyph từng trang.
Qua kiểm thử với một PDF có text layer gồm 179 trang, phần
`resolve -> validate -> parse -> clean -> chunk` tạo 307 chunks, chunk lớn nhất
999 token và loại bỏ các mẫu vỡ từ đã ghi nhận từ parser cũ. PDF scan không có
text layer vẫn chưa được hỗ trợ vì MVP không triển khai OCR.

Backend chịu trách nhiệm gọi endpoint trong background, quản lý processing job và cập nhật trạng thái tài liệu.


## Grounded answer generation

`POST /v1/answer-question` now runs retrieval first, filters weak chunks by `RAG_SIMILARITY_THRESHOLD`, then calls `GENERATION_MODEL` through `OpenAIGenerationProvider` to produce a more natural answer.
The model receives only the selected question, stateless `history`, and retrieved chunks. Citations are still generated from real `document_chunks` rows. If retrieval finds no suitable context, AI Service returns `not_found=true` without calling the generation model.

Generation runtime knobs:

```env
GENERATION_MODEL=gpt-4o-mini
GENERATION_MAX_RETRIES=2
GENERATION_RETRY_BASE_DELAY_SECONDS=0.5
GENERATION_REQUEST_TIMEOUT_SECONDS=30
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
- Endpoint `/v1/health/pgvector` yêu cầu `X-Internal-Key` và chỉ dành cho Backend hoặc kiểm tra nội bộ.
### Chạy toàn bộ kiểm thử với một tài liệu mới

Từ thư mục `ai-service`, truyền đường dẫn PDF/TXT bất kỳ:

```powershell
python scripts/test_document.py "C:\duong-dan\tai-lieu-moi.pdf"
```

Một command sẽ chạy:

```txt
95 unit/API tests
-> resolve đường dẫn
-> validate file
-> parse
-> clean
-> chunk toàn bộ tài liệu
-> kiểm tra index/token/page/content/lỗi vỡ từ
-> tạo báo cáo HTML
```

Để chỉ test tài liệu mà không chạy lại unit/API tests:

```powershell
python scripts/test_document.py "C:\duong-dan\tai-lieu-moi.pdf" --skip-unit-tests
```

Script trả exit code `0` khi toàn bộ điều kiện PASS và `1` khi có lỗi. Đồng thời,
script tạo báo cáo HTML trong `ai-service/.reports/` để xem thống kê và nội dung
từng chunk. Phạm vi hiện tại kết thúc tại chunking; chưa gọi OpenAI embedding
hoặc ghi PostgreSQL.
