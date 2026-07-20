"""Đọc cấu hình AI Service từ biến môi trường.

Mọi module dùng chung một đối tượng ``settings`` để tránh hard-code secret,
đường dẫn, model và các tham số của pipeline trong nhiều file khác nhau.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Khi chạy local, python-dotenv nạp các giá trị trong file .env vào os.environ.
# Trên Docker/production, các biến đã tồn tại trong môi trường vẫn được ưu tiên.
load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Tập hợp cấu hình bất biến trong suốt vòng đời của process.

    ``frozen=True`` ngăn code nghiệp vụ vô tình thay đổi cấu hình sau khi app
    khởi động. Muốn đổi cấu hình, ta thay biến môi trường rồi khởi động lại.
    """

    # Cấu hình chung của service.
    app_env: str = os.getenv("APP_ENV", "local")
    app_name: str = os.getenv("APP_NAME", "LMS RAG AI Service")

    # Secret và kết nối tới các service bên ngoài.
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5432/lms_rag",
    )
    db_connect_timeout: int = int(os.getenv("DB_CONNECT_TIMEOUT", "5"))
    internal_api_key: str = os.getenv("INTERNAL_API_KEY", "")

    # Shared volume mà Backend ghi file và AI Service chỉ đọc.
    upload_root: Path = Path(os.getenv("UPLOAD_ROOT", "/storage/uploads"))
    max_file_size_mb: int = int(os.getenv("MAX_FILE_SIZE_MB", "20"))

    # Model và tham số chia chunk/retrieval.
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    generation_model: str = os.getenv("GENERATION_MODEL", "gpt-4o-mini")
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    default_top_k: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    rag_similarity_threshold: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.3"))
    embedding_dimensions: int = int(os.getenv("EMBEDDING_DIMENSIONS", "1536"))

    # Cách gọi OpenAI embedding: batch, retry có giới hạn và timeout.
    embedding_batch_size: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "64"))
    embedding_max_retries: int = int(os.getenv("EMBEDDING_MAX_RETRIES", "2"))
    embedding_retry_base_delay_seconds: float = float(
        os.getenv("EMBEDDING_RETRY_BASE_DELAY_SECONDS", "0.5")
    )
    embedding_request_timeout_seconds: float = float(
        os.getenv("EMBEDDING_REQUEST_TIMEOUT_SECONDS", "30")
    )
    generation_max_retries: int = int(os.getenv("GENERATION_MAX_RETRIES", "2"))
    generation_retry_base_delay_seconds: float = float(
        os.getenv("GENERATION_RETRY_BASE_DELAY_SECONDS", "0.5")
    )
    generation_request_timeout_seconds: float = float(
        os.getenv("GENERATION_REQUEST_TIMEOUT_SECONDS", "30")
    )
    generation_default_max_tokens: int = int(
        os.getenv("GENERATION_DEFAULT_MAX_TOKENS", "700")
    )
    generation_summary_max_tokens: int = int(
        os.getenv("GENERATION_SUMMARY_MAX_TOKENS", "1200")
    )

    @property
    def max_file_size_bytes(self) -> int:
        """Đổi giới hạn MB sang byte để so sánh với ``Path.stat().st_size``."""
        return self.max_file_size_mb * 1024 * 1024


# Singleton cấu hình được import và dùng lại trong toàn bộ ứng dụng.
settings = Settings()
