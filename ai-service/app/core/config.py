import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_env: str = os.getenv("APP_ENV", "local")
    app_name: str = os.getenv("APP_NAME", "LMS RAG AI Service")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/lms_rag",
    )
    db_connect_timeout: int = int(os.getenv("DB_CONNECT_TIMEOUT", "5"))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    generation_model: str = os.getenv("GENERATION_MODEL", "gpt-4o-mini")
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))


settings = Settings()
