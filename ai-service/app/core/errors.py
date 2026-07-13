"""Mô hình lỗi thống nhất giữa các tầng của AI Service.

Code nghiệp vụ raise ``ServiceError``; API exception handler chuyển lỗi đó
thành JSON envelope. Nhờ vậy parser, embedding và repository không phụ thuộc
trực tiếp vào FastAPI nhưng vẫn trả cùng một contract cho Backend.
"""

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """Các mã lỗi ổn định mà Backend có thể xử lý bằng chương trình."""

    INVALID_INPUT = "INVALID_INPUT"
    UNAUTHORIZED_INTERNAL_CALL = "UNAUTHORIZED_INTERNAL_CALL"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    EMPTY_DOCUMENT = "EMPTY_DOCUMENT"
    PARSER_ERROR = "PARSER_ERROR"
    DOCUMENT_NOT_PROCESSED = "DOCUMENT_NOT_PROCESSED"
    NO_CHUNKS_FOUND = "NO_CHUNKS_FOUND"
    EMBEDDING_ERROR = "EMBEDDING_ERROR"
    RETRIEVAL_ERROR = "RETRIEVAL_ERROR"
    GENERATION_ERROR = "GENERATION_ERROR"
    INVALID_OUTPUT = "INVALID_OUTPUT"
    DATABASE_ERROR = "DATABASE_ERROR"
    DOCUMENT_DELETED_DURING_INDEX = "DOCUMENT_DELETED_DURING_INDEX"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class ErrorDetail(BaseModel):
    """Mô tả lỗi gắn với một field cụ thể trong request hoặc dữ liệu."""

    field: str
    message: str


class ServiceError(Exception):
    """Exception nghiệp vụ độc lập với framework web.

    Attributes:
        code: Mã lỗi ổn định trong ``ErrorCode``.
        message: Thông báo an toàn có thể trả cho Backend.
        status_code: HTTP status mà API layer sẽ sử dụng.
        details: Danh sách lỗi chi tiết theo field.
        context: Dữ liệu kỹ thuật chỉ dùng nội bộ, không tự động trả ra API.
    """

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        status_code: int = 400,
        details: list[ErrorDetail] | None = None,
        context: dict[str, Any] | None = None,
    ) -> None:
        """Khởi tạo lỗi và giữ message trong base ``Exception`` để logging."""
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        self.context = context or {}


class ErrorBody(BaseModel):
    """Phần ``error`` bên trong error envelope."""

    code: ErrorCode
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """JSON response chuẩn cho mọi request thất bại."""

    success: Literal[False] = False
    error: ErrorBody
