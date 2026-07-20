"""PostgreSQL/pgvector implementation của DocumentChunkRepository."""

import math
import re
import unicodedata
from collections.abc import Callable
from contextlib import AbstractContextManager
from typing import Any

import psycopg
from psycopg import errors as pg_errors

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

_KEYWORD_STOPWORDS = {
    "anh", "cac", "cho", "cua", "define", "dinh", "duoc", "gi", "hay", "is",
    "khai", "la", "nay", "nghia", "niem", "neu", "noi", "tai", "tai lieu",
    "the", "trong", "ve", "va", "voi", "what",
}
_KEYWORD_CANDIDATE_MULTIPLIER = 8
_KEYWORD_MIN_CANDIDATES = 24
_DEFINITION_SIGNAL_PATTERNS = (
    "%\u0111\u1ecbnh ngh\u0129a%",
    "%dinh nghia%",
    "% l\u00e0 vi\u1ec7c %",
    "% la viec %",
    "% l\u00e0 m\u1ed9t %",
    "% la mot %",
    "% \u0111\u01b0\u1ee3c g\u1ecdi l\u00e0 %",
    "% duoc goi la %",
)
_FRONT_MATTER_PATTERNS = (
    "%m\u1ee5c l\u1ee5c%",
    "%muc luc%",
    "%danh m\u1ee5c%",
    "%danh muc%",
    "%table of contents%",
    "%h\u1ecdc vi\u1ec7n%",
    "%hoc vien%",
    "%b\u00e0i gi\u1ea3ng%",
    "%bai giang%",
    "%----------%",
)


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
        except pg_errors.ForeignKeyViolation as exc:
            # Backend có thể đã xóa document trong lúc AI đang index.
            # Transaction đã rollback, nên chunks cũ không bị mất.
            raise ServiceError(
                ErrorCode.DOCUMENT_DELETED_DURING_INDEX,
                "Document đã bị xóa trước khi AI index hoàn tất",
                status_code=409,
                details=[
                    ErrorDetail(
                        field="document_id",
                        message=str(document_id),
                    )
                ],
            ) from exc
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

    def search_keyword_chunks(
        self,
        document_ids: list[int],
        query: str,
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        """Return literal matches ranked by phrase, definition and front-matter signals."""
        normalized_document_ids = self._validate_keyword_search_input(
            document_ids,
            query,
            top_k,
        )
        terms = self._extract_keyword_terms(query)
        phrases = self._extract_keyword_phrases(query)
        if not terms and not phrases:
            return []

        phrase_sql = self._weighted_match_sql(phrases, weight=3)
        term_sql = self._weighted_match_sql(terms, weight=1)
        match_sql_parts = [part for part in (phrase_sql, term_sql) if part]
        match_sql = " + ".join(match_sql_parts) if match_sql_parts else "0"
        phrase_count_sql = self._plain_match_sql(phrases) or "0"
        definition_boost_sql = self._definition_boost_sql(phrases) or "0"
        front_matter_sql = self._front_matter_penalty_sql()
        where_patterns = [*phrases, *terms]
        where_sql = " OR ".join("content ILIKE %s" for _ in where_patterns)
        candidate_limit = max(top_k * _KEYWORD_CANDIDATE_MULTIPLIER, _KEYWORD_MIN_CANDIDATES)

        sql = f"""
WITH matched AS (
    SELECT
        id,
        document_id,
        chunk_index,
        ({match_sql}) AS match_count,
        ({phrase_count_sql}) AS phrase_count,
        ({definition_boost_sql}) AS definition_boost,
        ({front_matter_sql}) AS front_matter_penalty
    FROM document_chunks
    WHERE document_id = ANY(%s::bigint[])
      AND ({where_sql})
    ORDER BY
        definition_boost DESC,
        phrase_count DESC,
        match_count DESC,
        front_matter_penalty ASC,
        document_id,
        chunk_index
    LIMIT %s
), expanded AS (
    SELECT
        dc.id,
        dc.document_id,
        dc.page_number,
        dc.chunk_index,
        dc.content,
        dc.token_count,
        m.match_count,
        m.phrase_count,
        m.definition_boost,
        m.front_matter_penalty,
        ABS(dc.chunk_index - m.chunk_index) AS neighbor_distance,
        m.chunk_index AS matched_chunk_index
    FROM matched m
    JOIN document_chunks dc
      ON dc.document_id = m.document_id
     AND dc.chunk_index BETWEEN m.chunk_index AND m.chunk_index + 1
), deduped AS (
    SELECT DISTINCT ON (id)
        id,
        document_id,
        page_number,
        chunk_index,
        content,
        token_count,
        match_count,
        phrase_count,
        definition_boost,
        front_matter_penalty,
        neighbor_distance,
        matched_chunk_index
    FROM expanded
    ORDER BY id, neighbor_distance, definition_boost DESC, phrase_count DESC, match_count DESC
)
SELECT
    id,
    document_id,
    page_number,
    chunk_index,
    content,
    token_count,
    match_count,
    phrase_count,
    definition_boost,
    front_matter_penalty
FROM deduped
ORDER BY
    definition_boost DESC,
    phrase_count DESC,
    match_count DESC,
    front_matter_penalty ASC,
    matched_chunk_index,
    neighbor_distance,
    chunk_index
LIMIT %s
"""
        parameters = [
            *self._patterns(phrases),
            *self._patterns(terms),
            *self._patterns(phrases),
            *self._definition_parameters(phrases),
            *self._patterns(_FRONT_MATTER_PATTERNS),
            normalized_document_ids,
            *self._patterns(where_patterns),
            candidate_limit,
            top_k,
        ]

        try:
            with self.connection_factory() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(sql, parameters)
                    rows = cursor.fetchall()
        except psycopg.Error as exc:
            raise ServiceError(
                ErrorCode.RETRIEVAL_ERROR,
                "Khong the keyword retrieval document chunks tu PostgreSQL",
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

        return [self._to_keyword_chunk(row, max(len(terms), 1)) for row in rows]

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

    def _validate_keyword_search_input(
        self,
        document_ids: list[int],
        query: str,
        top_k: int,
    ) -> list[int]:
        if not query.strip():
            raise self._invalid_input("query", "query must not be blank")
        return self._validate_document_ids_and_top_k(document_ids, top_k)

    def _validate_document_ids_and_top_k(
        self,
        document_ids: list[int],
        top_k: int,
    ) -> list[int]:
        if not document_ids:
            raise self._invalid_input(
                "document_ids",
                "document_ids must contain at least one item",
            )
        if any(document_id <= 0 for document_id in document_ids):
            raise self._invalid_input(
                "document_ids",
                "all document_ids must be greater than 0",
            )
        if top_k <= 0:
            raise self._invalid_input("top_k", "top_k must be greater than 0")

        normalized_document_ids: list[int] = []
        seen: set[int] = set()
        for document_id in document_ids:
            if document_id not in seen:
                seen.add(document_id)
                normalized_document_ids.append(document_id)
        return normalized_document_ids

    @staticmethod
    def _patterns(values: list[str] | tuple[str, ...]) -> list[str]:
        return [value if "%" in value else f"%{value}%" for value in values]

    @staticmethod
    def _weighted_match_sql(values: list[str], weight: int) -> str:
        if not values:
            return ""
        return " + ".join(
            f"CASE WHEN content ILIKE %s THEN {weight} ELSE 0 END"
            for _ in values
        )

    @staticmethod
    def _plain_match_sql(values: list[str]) -> str:
        if not values:
            return ""
        return " + ".join(
            "CASE WHEN content ILIKE %s THEN 1 ELSE 0 END"
            for _ in values
        )

    @staticmethod
    def _definition_boost_sql(phrases: list[str]) -> str:
        if not phrases:
            return ""
        signal_sql = " OR ".join("content ILIKE %s" for _ in _DEFINITION_SIGNAL_PATTERNS)
        return " + ".join(
            f"CASE WHEN content ILIKE %s AND ({signal_sql}) THEN 1 ELSE 0 END"
            for _ in phrases
        )

    @staticmethod
    def _definition_parameters(phrases: list[str]) -> list[str]:
        parameters: list[str] = []
        signal_patterns = PostgresDocumentChunkRepository._patterns(_DEFINITION_SIGNAL_PATTERNS)
        for phrase in phrases:
            parameters.append(f"%{phrase}%")
            parameters.extend(signal_patterns)
        return parameters

    @staticmethod
    def _front_matter_penalty_sql() -> str:
        checks = " OR ".join("content ILIKE %s" for _ in _FRONT_MATTER_PATTERNS)
        return f"CASE WHEN {checks} THEN 1 ELSE 0 END"

    @classmethod
    def _extract_keyword_phrases(cls, query: str) -> list[str]:
        normalized = " ".join(query.casefold().strip().strip("?.!:;").split())
        candidates: list[str] = []
        patterns = (
            "^(?:hay|h\u00e3y|cho t\u00f4i bi\u1ebft|cho toi biet)?\\s*(.+?)\\s+l\u00e0\\s+g\u00ec$",
            "^(?:hay|hay|cho toi biet)?\\s*(.+?)\\s+la\\s+gi$",
            "^kh\u00e1i ni\u1ec7m\\s+(.+?)(?:\\s+l\u00e0\\s+g\u00ec)?$",
            "^khai niem\\s+(.+?)(?:\\s+la\\s+gi)?$",
            "^\u0111\u1ecbnh ngh\u0129a\\s+(.+)$",
            "^dinh nghia\\s+(.+)$",
            "^what\\s+is\\s+(.+)$",
            "^define\\s+(.+)$",
        )
        for pattern in patterns:
            match = re.search(pattern, normalized, flags=re.IGNORECASE)
            if match:
                candidates.append(match.group(1))

        phrases: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            phrase = cls._clean_keyword_phrase(candidate)
            normalized_phrase = cls._normalize_keyword_term(phrase)
            if len(normalized_phrase) < 4 or normalized_phrase in seen:
                continue
            seen.add(normalized_phrase)
            phrases.append(phrase)
        return phrases[:2]

    @classmethod
    def _clean_keyword_phrase(cls, phrase: str) -> str:
        words = [word for word in re.findall(r"[\w]+", phrase, flags=re.UNICODE)]
        cleaned_words: list[str] = []
        for word in words:
            normalized_word = cls._normalize_keyword_term(word.casefold())
            if normalized_word in _KEYWORD_STOPWORDS:
                continue
            cleaned_words.append(word)
        return " ".join(cleaned_words).strip()

    @classmethod
    def _extract_keyword_terms(cls, query: str) -> list[str]:
        raw_terms = re.findall(r"[\w]+", query.casefold(), flags=re.UNICODE)
        terms: list[str] = []
        seen: set[str] = set()
        for term in raw_terms:
            normalized_term = cls._normalize_keyword_term(term)
            if len(normalized_term) < 2 or normalized_term in _KEYWORD_STOPWORDS or normalized_term in seen:
                continue
            seen.add(normalized_term)
            terms.append(term)
        return terms[:6]

    @staticmethod
    def _normalize_keyword_term(term: str) -> str:
        decomposed = unicodedata.normalize("NFD", term.replace("\u0111", "d"))
        return "".join(
            character
            for character in decomposed
            if unicodedata.category(character) != "Mn"
        )
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
    def _to_keyword_chunk(row: tuple[Any, ...], term_count: int) -> RetrievedDocumentChunk:
        match_count = int(row[6])
        score = min(1.0, 0.70 + (match_count / max(term_count, 1)) * 0.30)
        return RetrievedDocumentChunk(
            chunk_id=int(row[0]),
            document_id=int(row[1]),
            page_number=row[2],
            chunk_index=int(row[3]),
            content=str(row[4]),
            token_count=int(row[5]),
            distance=max(0.0, 1.0 - score),
            score=score,
        )

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
