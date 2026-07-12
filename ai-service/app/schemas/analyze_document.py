"""Contract cho API kiểm tra tài liệu có thể RAG hay không."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.document import DocumentFileType
from app.schemas.process_document import ProcessDocumentMetadata


class AnalyzeDocumentRequest(BaseModel):
    """Payload tối thiểu Backend gửi sau khi đã lưu file vào shared storage."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    storage_key: str = Field(min_length=1, max_length=1024)
    file_type: DocumentFileType
    metadata: ProcessDocumentMetadata | None = None

    @field_validator("storage_key")
    @classmethod
    def storage_key_must_not_be_blank(cls, value: str) -> str:
        """Từ chối chuỗi trắng và chuẩn hóa khoảng trắng ngoài."""
        if not value.strip():
            raise ValueError("storage_key không được để trống")
        return value.strip()


class AnalyzeDocumentResult(BaseModel):
    """Kết quả để Backend quyết định tài liệu có chạy RAG được không."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    can_rag: bool
    rag_status: Literal["READY_TO_PROCESS", "UNSUPPORTED"]
    page_count: int = Field(ge=0)
    estimated_token_count: int = Field(ge=0)
    estimated_chunk_count: int = Field(ge=0)
    unsupported_reason: str | None = Field(default=None, max_length=100)