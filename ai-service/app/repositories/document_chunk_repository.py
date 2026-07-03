from abc import ABC, abstractmethod

from app.schemas.document import EmbeddedDocument


class DocumentChunkRepository(ABC):
    @abstractmethod
    def replace_document_chunks(
        self,
        document_id: int,
        lecture_id: int,
        document: EmbeddedDocument,
    ) -> int:
        """Atomically replace all chunks and return the inserted count."""
        raise NotImplementedError