"""Contract request/response của endpoint xử lý học liệu."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.document import DocumentFileType


class ProcessDocumentMetadata(BaseModel):
    """Metadata nghiệp vụ của Document; AI không dùng để phân quyền."""

    model_config = ConfigDict(extra="forbid")

    subject: str | None = Field(default=None, max_length=150)
    topic: str | None = Field(default=None, max_length=255)
    chapter: str | None = Field(default=None, max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("subject", "topic", "chapter")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        """Chuẩn hóa metadata text; chuỗi trắng được xem như không có."""
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("tags")
    @classmethod
    def tags_must_be_clean(cls, value: list[str]) -> list[str]:
        """Trim tags, bỏ tag rỗng và giữ thứ tự không trùng lặp."""
        seen: set[str] = set()
        cleaned: list[str] = []
        for tag in value:
            stripped = tag.strip()
            if not stripped or stripped in seen:
                continue
            seen.add(stripped)
            cleaned.append(stripped)
        return cleaned


class ProcessDocumentRequest(BaseModel):
    """Dữ liệu Backend gửi để AI xử lý một file trong shared storage."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    storage_key: str = Field(min_length=1, max_length=1024)
    file_type: DocumentFileType
    reprocess: bool = False
    metadata: ProcessDocumentMetadata | None = None

    @field_validator("storage_key")
    @classmethod
    def storage_key_must_not_be_blank(cls, value: str) -> str:
        """Từ chối chuỗi chỉ có whitespace và chuẩn hóa khoảng trắng ngoài."""
        if not value.strip():
            raise ValueError("storage_key không được để trống")
        return value.strip()


class ProcessDocumentResult(BaseModel):
    """Kết quả AI trả để Backend cập nhật document và processing job."""

    model_config = ConfigDict(extra="forbid")

    document_id: int = Field(gt=0)
    status: Literal["PROCESSED"] = "PROCESSED"
    page_count: int = Field(gt=0)
    chunk_count: int = Field(gt=0)
