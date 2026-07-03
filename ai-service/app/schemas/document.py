from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class DocumentFileType(str, Enum):
    PDF = "PDF"
    TXT = "TXT"

    @property
    def extension(self) -> str:
        return f".{self.value.lower()}"

    @property
    def media_type(self) -> str:
        media_types = {
            DocumentFileType.PDF: "application/pdf",
            DocumentFileType.TXT: "text/plain",
        }
        return media_types[self]


class ValidatedDocument(BaseModel):
    storage_key: str = Field(min_length=1)
    path: Path
    file_type: DocumentFileType
    media_type: str
    size_bytes: int = Field(ge=0)