# AI Service

AI Service la FastAPI service phu trach xu ly tai lieu, embedding, retrieval, RAG answer, summary va quiz cho LMS RAG Lecture Assistant.

## Chay local

Tao virtual environment:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Cai dependencies:

```powershell
pip install -r requirements.txt
```

Tao file `.env` tu `.env.example`, sau do dien `OPENAI_API_KEY` neu can goi model that.

Chay service:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```txt
GET http://localhost:8000/health
```
