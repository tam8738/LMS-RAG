"""Contract cho endpoint index RAG sau khi document được approve."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.document import DocumentFileType
from app.schemas.process_document import ProcessDocumentMetadata


class IndexDocumentRequest(BaseModel):
    """Payload Backend gửi khi cần lập chỉ mục RAG cho một document."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    storage_key: str = Field(min_length=1, max_length=1024)
    file_type: DocumentFileType
    reindex: bool = False
    metadata: ProcessDocumentMetadata | None = None

    @field_validator("storage_key")
    @classmethod
    def storage_key_must_not_be_blank(cls, value: str) -> str:
        """Chuẩn hóa khoảng trắng ngoài và từ chối chuỗi rỗng."""
        if not value.strip():
            raise ValueError("storage_key không được để trống")
        return value.strip()


class IndexDocumentResult(BaseModel):
    """Kết quả để Backend cập nhật rag_status sau khi index thành công."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    rag_status: Literal["READY"] = "READY"
    page_count: int = Field(gt=0)
    chunk_count: int = Field(gt=0)