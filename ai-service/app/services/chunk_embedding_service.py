import math

from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.embeddings.base import EmbeddingProvider
from app.schemas.document import (
    ChunkedDocument,
    EmbeddedDocument,
    EmbeddedDocumentChunk,
)


class ChunkEmbeddingService:
    def __init__(self, provider: EmbeddingProvider) -> None:
        self.provider = provider

    def embed(self, document: ChunkedDocument) -> EmbeddedDocument:
        vectors = self.provider.embed(
            [chunk.content for chunk in document.chunks]
        )
        if len(vectors) != document.chunk_count:
            raise ServiceError(
                ErrorCode.EMBEDDING_ERROR,
                "Số lượng embedding không khớp số lượng chunk",
                status_code=502,
                details=[
                    ErrorDetail(
                        field="embedding_count",
                        message=(
                            f"Cần {document.chunk_count}, nhận {len(vectors)}"
                        ),
                    )
                ],
            )

        embedded_chunks: list[EmbeddedDocumentChunk] = []
        for chunk, vector in zip(document.chunks, vectors):
            if len(vector) != self.provider.dimensions:
                raise ServiceError(
                    ErrorCode.EMBEDDING_ERROR,
                    "Embedding có số chiều không hợp lệ",
                    status_code=502,
                    details=[
                        ErrorDetail(
                            field="embedding_dimensions",
                            message=(
                                f"Chunk {chunk.chunk_index}: "
                                f"cần {self.provider.dimensions}, "
                                f"nhận {len(vector)}"
                            ),
                        )
                    ],
                )
            if any(not math.isfinite(value) for value in vector):
                raise ServiceError(
                    ErrorCode.EMBEDDING_ERROR,
                    "Embedding chứa giá trị không hữu hạn",
                    status_code=502,
                    details=[
                        ErrorDetail(
                            field="embedding",
                            message=(
                                f"Chunk {chunk.chunk_index} chứa NaN hoặc Infinity"
                            ),
                        )
                    ],
                )

            embedded_chunks.append(
                EmbeddedDocumentChunk(
                    **chunk.model_dump(),
                    embedding=vector,
                )
            )

        return EmbeddedDocument(
            file_type=document.file_type,
            page_count=document.page_count,
            embedding_model=self.provider.model_name,
            embedding_dimensions=self.provider.dimensions,
            chunks=embedded_chunks,
        )