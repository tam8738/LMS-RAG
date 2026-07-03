import os
from dataclasses import dataclass
from pathlib import Path

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
    internal_api_key: str = os.getenv("INTERNAL_API_KEY", "")
    upload_root: Path = Path(os.getenv("UPLOAD_ROOT", "/storage/uploads"))
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "20"))
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    generation_model: str = os.getenv("GENERATION_MODEL", "gpt-4o-mini")
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))
    embedding_batch_size: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "64"))
    embedding_max_retries: int = int(os.getenv("EMBEDDING_MAX_RETRIES", "2"))
    embedding_retry_base_delay_seconds: float = float(
        os.getenv("EMBEDDING_RETRY_BASE_DELAY_SECONDS", "0.5")
    )
    embedding_request_timeout_seconds: float = float(
        os.getenv("EMBEDDING_REQUEST_TIMEOUT_SECONDS", "30")
    )

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


settings = Settings()
