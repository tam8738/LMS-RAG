"""Contract request/response của endpoint xử lý học liệu."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.document import DocumentFileType


class ProcessDocumentRequest(BaseModel):
    """Dữ liệu Backend gửi để AI xử lý một file trong shared storage."""

    document_id: int = Field(gt=0)
    lecture_id: int = Field(gt=0)
    storage_key: str = Field(min_length=1, max_length=1024)
    file_type: DocumentFileType
    reprocess: bool = False

    @field_validator("storage_key")
    @classmethod
    def storage_key_must_not_be_blank(cls, value: str) -> str:
        """Từ chối chuỗi chỉ có whitespace và chuẩn hóa khoảng trắng ngoài."""
        if not value.strip():
            raise ValueError("storage_key không được để trống")
        return value.strip()


class ProcessDocumentResult(BaseModel):
    """Kết quả AI trả để Backend cập nhật document và processing job."""

    document_id: int = Field(gt=0)
    lecture_id: int = Field(gt=0)
    status: Literal["PROCESSED"] = "PROCESSED"
    page_count: int = Field(gt=0)
    chunk_count: int = Field(gt=0)