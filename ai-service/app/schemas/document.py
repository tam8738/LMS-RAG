"""Các model biểu diễn tài liệu qua từng giai đoạn của AI pipeline.

Dòng biến đổi chính:
ValidatedDocument -> ParsedDocument -> ChunkedDocument -> EmbeddedDocument.
Mỗi model bổ sung dữ liệu mới nhưng vẫn giữ metadata cần cho citation.
"""

from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class DocumentFileType(str, Enum):
    """Định dạng học liệu được hỗ trợ trong MVP."""

    PDF = "PDF"
    TXT = "TXT"

    @property
    def extension(self) -> str:
        """Trả extension chuẩn để đối chiếu với tên file."""
        return f".{self.value.lower()}"

    @property
    def media_type(self) -> str:
        """Ánh xạ loại nghiệp vụ sang MIME type chuẩn."""
        media_types = {
            DocumentFileType.PDF: "application/pdf",
            DocumentFileType.TXT: "text/plain",
        }
        return media_types[self]


class ValidatedDocument(BaseModel):
    """File đã resolve an toàn và vượt qua kiểm tra type/size/content cơ bản."""

    storage_key: str = Field(min_length=1)
    path: Path
    file_type: DocumentFileType
    media_type: str
    size_bytes: int = Field(ge=0)


class ParsedPage(BaseModel):
    """Text trích xuất từ một trang; TXT dùng ``page_number=None``."""

    page_number: int | None = Field(default=None, ge=1)
    content: str = Field(min_length=1)


class ParsedDocument(BaseModel):
    """Kết quả parser, trước bước làm sạch và chia chunk."""

    file_type: DocumentFileType
    page_count: int = Field(ge=1)
    pages: list[ParsedPage] = Field(min_length=1)


class DocumentChunk(BaseModel):
    """Đoạn text có giới hạn token và metadata nguồn để làm citation."""

    page_number: int | None = Field(default=None, ge=1)
    chunk_index: int = Field(ge=0)
    content: str = Field(min_length=1)
    token_count: int = Field(ge=1)


class ChunkedDocument(BaseModel):
    """Toàn bộ chunks sau parse -> clean -> chunk."""

    file_type: DocumentFileType
    page_count: int = Field(ge=1)
    chunks: list[DocumentChunk] = Field(min_length=1)

    @property
    def chunk_count(self) -> int:
        """Tính trực tiếp để không lưu một count có thể lệch khỏi danh sách."""
        return len(self.chunks)


class EmbeddedDocumentChunk(DocumentChunk):
    """Chunk đã có vector embedding nhưng chưa được lưu PostgreSQL."""

    embedding: list[float] = Field(min_length=1)


class EmbeddedDocument(BaseModel):
    """Kết quả sẵn sàng cho repository ghi vào ``document_chunks``."""

    file_type: DocumentFileType
    page_count: int = Field(ge=1)
    embedding_model: str = Field(min_length=1)
    embedding_dimensions: int = Field(gt=0)
    chunks: list[EmbeddedDocumentChunk] = Field(min_length=1)

    @property
    def chunk_count(self) -> int:
        """Số vector phải luôn bằng số embedded chunks."""
        return len(self.chunks)


class RetrievedDocumentChunk(BaseModel):
    """Chunk retrieved from pgvector for RAG answer and citation."""

    chunk_id: int = Field(gt=0)
    document_id: int = Field(gt=0)
    page_number: int | None = Field(default=None, ge=1)
    chunk_index: int = Field(ge=0)
    content: str = Field(min_length=1)
    token_count: int = Field(ge=1)
    distance: float = Field(ge=0)
    score: float = Field(ge=0)
