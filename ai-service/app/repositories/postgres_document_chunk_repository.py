"""PostgreSQL/pgvector implementation của DocumentChunkRepository."""

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
from app.schemas.document import EmbeddedDocument, RetrievedDocumentChunk

# SQL tách thành hằng số để dễ đọc/test và luôn truyền dữ liệu qua parameters.
_DELETE_DOCUMENT_CHUNKS_SQL = """
DELETE FROM document_chunks
WHERE document_id = %s
"""

_INSERT_DOCUMENT_CHUNK_SQL = """
INSERT INTO document_chunks (
    document_id,
    page_number,
    chunk_index,
    content,
    token_count,
    embedding
)
VALUES (%s, %s, %s, %s, %s, %s::vector)
"""

_SEARCH_SIMILAR_CHUNKS_SQL = """
SELECT
    id,
    document_id,
    page_number,
    chunk_index,
    content,
    token_count,
    embedding <=> %s::vector AS distance
FROM document_chunks
WHERE document_id = ANY(%s::bigint[])
ORDER BY embedding <=> %s::vector, document_id, chunk_index
LIMIT %s
"""

# Factory trả context manager connection; test thay bằng fake transaction DB.
ConnectionFactory = Callable[[], AbstractContextManager[Any]]


class PostgresDocumentChunkRepository(DocumentChunkRepository):
    """Batch replace chunks trong một transaction PostgreSQL."""

    def __init__(
        self,
        connection_factory: ConnectionFactory = get_connection,
        expected_dimensions: int | None = None,
    ) -> None:
        """Inject connection factory trong test; production dùng PostgreSQL."""
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
        document: EmbeddedDocument,
    ) -> int:
        """Xóa chunks cũ và batch insert chunks mới một cách atomic.

        Validation và build rows chạy trước khi mở transaction. Khi bất kỳ
        insert nào lỗi, exception thoát khỏi ``connection.transaction()`` nên
        cả DELETE lẫn các INSERT trước đó đều được rollback.
        """
        self._validate_document(document_id, document)
        rows = self._build_rows(document_id, document)

        try:
            with self.connection_factory() as connection:
                with connection.transaction():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            _DELETE_DOCUMENT_CHUNKS_SQL,
                            (document_id,),
                        )
                        # executemany gửi toàn bộ rows qua một API batch thay vì
                        # tự execute và commit từng chunk riêng lẻ.
                        cursor.executemany(
                            _INSERT_DOCUMENT_CHUNK_SQL,
                            rows,
                        )
        except psycopg.Error as exc:
            # Lỗi được bắt bên ngoài transaction block, sau khi rollback xảy ra.
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

    def search_similar_chunks(
        self,
        document_ids: list[int],
        query_embedding: list[float],
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        """Return top-k nearest chunks filtered by Backend-authorized documents."""
        normalized_document_ids = self._validate_search_input(
            document_ids,
            query_embedding,
            top_k,
        )
        query_vector = to_vector_literal(query_embedding)

        try:
            with self.connection_factory() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        _SEARCH_SIMILAR_CHUNKS_SQL,
                        (
                            query_vector,
                            normalized_document_ids,
                            query_vector,
                            top_k,
                        ),
                    )
                    rows = cursor.fetchall()
        except psycopg.Error as exc:
            raise ServiceError(
                ErrorCode.RETRIEVAL_ERROR,
                "Không thể retrieval document chunks từ PostgreSQL",
                status_code=503,
                details=[
                    ErrorDetail(
                        field="document_ids",
                        message=",".join(
                            str(value) for value in normalized_document_ids
                        ),
                    )
                ],
            ) from exc

        return [self._to_retrieved_chunk(row) for row in rows]

    def _validate_search_input(
        self,
        document_ids: list[int],
        query_embedding: list[float],
        top_k: int,
    ) -> list[int]:
        """Validate retrieval input before spending a database connection."""
        if not document_ids:
            raise self._invalid_input(
                "document_ids",
                "document_ids phải có ít nhất một phần tử",
            )
        if any(document_id <= 0 for document_id in document_ids):
            raise self._invalid_input(
                "document_ids",
                "Mọi document_id phải lớn hơn 0",
            )
        if top_k <= 0:
            raise self._invalid_input("top_k", "top_k phải lớn hơn 0")
        if len(query_embedding) != self.expected_dimensions:
            raise self._invalid_input(
                "embedding_dimensions",
                (
                    f"Cần {self.expected_dimensions}, "
                    f"nhận {len(query_embedding)}"
                ),
            )
        if any(not math.isfinite(value) for value in query_embedding):
            raise self._invalid_input(
                "query_embedding",
                "Query embedding chứa NaN hoặc Infinity",
            )

        normalized_document_ids: list[int] = []
        seen: set[int] = set()
        for document_id in document_ids:
            if document_id not in seen:
                seen.add(document_id)
                normalized_document_ids.append(document_id)
        return normalized_document_ids

    @staticmethod
    def _to_retrieved_chunk(row: tuple[Any, ...]) -> RetrievedDocumentChunk:
        """Map one SQL row to the retrieval model used by the RAG layer."""
        distance = float(row[6])
        return RetrievedDocumentChunk(
            chunk_id=int(row[0]),
            document_id=int(row[1]),
            page_number=row[2],
            chunk_index=int(row[3]),
            content=str(row[4]),
            token_count=int(row[5]),
            distance=distance,
            score=max(0.0, 1.0 - distance),
        )

    def _validate_document(
        self,
        document_id: int,
        document: EmbeddedDocument,
    ) -> None:
        """Chặn dữ liệu sai trước khi tốn connection/transaction database."""
        if document_id <= 0:
            raise self._invalid_input("document_id", "document_id phải lớn hơn 0")
        if document.embedding_dimensions != self.expected_dimensions:
            raise self._invalid_input(
                "embedding_dimensions",
                (
                    f"Cần {self.expected_dimensions}, "
                    f"nhận {document.embedding_dimensions}"
                ),
            )

        # Index liên tục giúp unique(document_id, chunk_index) có ý nghĩa và
        # giữ thứ tự tài liệu xác định khi đọc lại.
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
        document: EmbeddedDocument,
    ) -> list[tuple[Any, ...]]:
        """Ánh xạ model nghiệp vụ sang đúng thứ tự cột của INSERT SQL."""
        return [
            (
                document_id,
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
        """Tạo lỗi validation nhất quán cho tầng persistence."""
        return ServiceError(
            ErrorCode.INVALID_INPUT,
            "Dữ liệu document chunks không hợp lệ",
            status_code=422,
            details=[ErrorDetail(field=field, message=message)],
        )
