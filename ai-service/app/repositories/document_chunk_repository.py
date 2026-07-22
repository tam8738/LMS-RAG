"""Repository abstraction cho persistence của document chunks."""

from abc import ABC, abstractmethod

from app.schemas.document import EmbeddedDocument, RetrievedDocumentChunk


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

    @abstractmethod
    def get_document_chunks(
        self,
        document_ids: list[int],
        max_chunks: int,
    ) -> list[RetrievedDocumentChunk]:
        """Return representative chunks inside the authorized document scope."""
        raise NotImplementedError

    @abstractmethod
    def search_keyword_chunks(
        self,
        document_ids: list[int],
        query: str,
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        """Find chunks by literal terms inside the authorized document scope."""
        raise NotImplementedError

    @abstractmethod
    def search_similar_chunks(
        self,
        document_ids: list[int],
        query_embedding: list[float],
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        """Find nearest chunks inside the authorized document scope."""
        raise NotImplementedError
