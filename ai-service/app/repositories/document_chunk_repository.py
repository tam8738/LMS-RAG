"""Repository abstraction cho persistence của document chunks."""

from abc import ABC, abstractmethod

from app.schemas.document import EmbeddedDocument


class DocumentChunkRepository(ABC):
    """Tách nghiệp vụ xử lý tài liệu khỏi chi tiết PostgreSQL/pgvector."""

    @abstractmethod
    def replace_document_chunks(
        self,
        document_id: int,
        document: EmbeddedDocument,
    ) -> int:
        """Thay toàn bộ chunks atomically và trả số rows đã insert."""
        raise NotImplementedError
