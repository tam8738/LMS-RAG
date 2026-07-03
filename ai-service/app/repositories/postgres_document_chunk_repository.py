import math
from collections.abc import Callable
from contextlib import AbstractContextManager
from typing import Any

import psycopg

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.db.connection import get_connection
from app.db.pgvector_store import to_vector_literal
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.document import EmbeddedDocument

_DELETE_DOCUMENT_CHUNKS_SQL = """
DELETE FROM document_chunks
WHERE document_id = %s
"""

_INSERT_DOCUMENT_CHUNK_SQL = """
INSERT INTO document_chunks (
    document_id,
    lecture_id,
    page_number,
    chunk_index,
    content,
    token_count,
    embedding
)
VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
"""

ConnectionFactory = Callable[[], AbstractContextManager[Any]]


class PostgresDocumentChunkRepository(DocumentChunkRepository):
    def __init__(
        self,
        connection_factory: ConnectionFactory = get_connection,
        expected_dimensions: int | None = None,
    ) -> None:
        self.connection_factory = connection_factory
        self.expected_dimensions = (
            expected_dimensions
            if expected_dimensions is not None
            else settings.embedding_dimensions
        )
        if self.expected_dimensions <= 0:
            raise ValueError("expected_dimensions phải lớn hơn 0")

    def replace_document_chunks(
        self,
        document_id: int,
        lecture_id: int,
        document: EmbeddedDocument,
    ) -> int:
        self._validate_document(document_id, lecture_id, document)
        rows = self._build_rows(document_id, lecture_id, document)

        try:
            with self.connection_factory() as connection:
                with connection.transaction():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            _DELETE_DOCUMENT_CHUNKS_SQL,
                            (document_id,),
                        )
                        cursor.executemany(
                            _INSERT_DOCUMENT_CHUNK_SQL,
                            rows,
                        )
        except psycopg.Error as exc:
            raise ServiceError(
                ErrorCode.DATABASE_ERROR,
                "Không thể lưu document chunks vào PostgreSQL",
                status_code=503,
                details=[
                    ErrorDetail(
                        field="document_id",
                        message=str(document_id),
                    )
                ],
            ) from exc

        return len(rows)

    def _validate_document(
        self,
        document_id: int,
        lecture_id: int,
        document: EmbeddedDocument,
    ) -> None:
        if document_id <= 0:
            raise self._invalid_input("document_id", "document_id phải lớn hơn 0")
        if lecture_id <= 0:
            raise self._invalid_input("lecture_id", "lecture_id phải lớn hơn 0")
        if document.embedding_dimensions != self.expected_dimensions:
            raise self._invalid_input(
                "embedding_dimensions",
                (
                    f"Cần {self.expected_dimensions}, "
                    f"nhận {document.embedding_dimensions}"
                ),
            )

        chunk_indexes = [chunk.chunk_index for chunk in document.chunks]
        expected_indexes = list(range(document.chunk_count))
        if chunk_indexes != expected_indexes:
            raise self._invalid_input(
                "chunk_index",
                f"Cần {expected_indexes}, nhận {chunk_indexes}",
            )

        for chunk in document.chunks:
            if len(chunk.embedding) != self.expected_dimensions:
                raise self._invalid_input(
                    "embedding_dimensions",
                    (
                        f"Chunk {chunk.chunk_index}: "
                        f"cần {self.expected_dimensions}, "
                        f"nhận {len(chunk.embedding)}"
                    ),
                )
            if any(not math.isfinite(value) for value in chunk.embedding):
                raise self._invalid_input(
                    "embedding",
                    f"Chunk {chunk.chunk_index} chứa NaN hoặc Infinity",
                )

    @staticmethod
    def _build_rows(
        document_id: int,
        lecture_id: int,
        document: EmbeddedDocument,
    ) -> list[tuple[Any, ...]]:
        return [
            (
                document_id,
                lecture_id,
                chunk.page_number,
                chunk.chunk_index,
                chunk.content,
                chunk.token_count,
                to_vector_literal(chunk.embedding),
            )
            for chunk in document.chunks
        ]

    @staticmethod
    def _invalid_input(field: str, message: str) -> ServiceError:
        return ServiceError(
            ErrorCode.INVALID_INPUT,
            "Dữ liệu document chunks không hợp lệ",
            status_code=422,
            details=[ErrorDetail(field=field, message=message)],
        )