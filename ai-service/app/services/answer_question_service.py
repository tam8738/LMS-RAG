"""Application service for document-scoped RAG question answering."""

import re

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.embeddings.base import EmbeddingProvider
from app.generation.base import GenerationProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.answer_question import (
    AnswerCitation,
    AnswerQuestionRequest,
    AnswerQuestionResult,
    ConversationMessage,
)
from app.schemas.document import RetrievedDocumentChunk
from app.utils.question_intent import (
    is_follow_up_question,
    is_insufficient_answer,
    is_summary_question,
)


_SUMMARY_TOP_K = 8
_DEFAULT_RETRIEVAL_TOP_K = 8
_HISTORY_ANSWER_CONTEXT_LIMIT = 500
_CITATION_EXCERPT_LIMIT = 240
_CITATION_SENTENCE_BOUNDARY_RATIO = 0.55


class AnswerQuestionService:
    """Coordinate question embedding, vector retrieval and citation formatting."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        chunk_repository: DocumentChunkRepository,
        generation_provider: GenerationProvider | None = None,
        similarity_threshold: float | None = None,
    ) -> None:
        """Inject dependencies so tests can use deterministic mocks."""
        self.embedding_provider = embedding_provider
        self.chunk_repository = chunk_repository
        self.generation_provider = generation_provider
        self.similarity_threshold = (
            settings.rag_similarity_threshold
            if similarity_threshold is None
            else similarity_threshold
        )
        if not 0.0 <= self.similarity_threshold <= 1.0:
            raise ValueError("similarity_threshold phai nam trong khoang 0.0 den 1.0")

    def answer(self, request: AnswerQuestionRequest) -> AnswerQuestionResult:
        """Answer only from retrieved chunks inside Backend-authorized documents."""
        retrieval_top_k = self._select_retrieval_top_k(request)
        retrieval_query = self._build_retrieval_query(request.question, request.history)
        vector_chunks = self._retrieve_chunks(request, retrieval_query, retrieval_top_k)
        keyword_chunks = self._retrieve_keyword_chunks(request, retrieval_query, retrieval_top_k)
        chunks = self._merge_retrieved_chunks(keyword_chunks, vector_chunks, retrieval_top_k)

        if not chunks:
            return AnswerQuestionResult(
                answer=self._not_found_answer(request.language),
                not_found=True,
                citations=[],
                tokens_used=0,
            )

        if self.generation_provider is not None:
            generated = self.generation_provider.generate_answer(
                question=request.question,
                language=request.language,
                history=request.history,
                chunks=chunks,
            )
            if is_insufficient_answer(generated.answer):
                return AnswerQuestionResult(
                    answer=generated.answer,
                    not_found=True,
                    citations=[],
                    tokens_used=generated.tokens_used,
                )

            return AnswerQuestionResult(
                answer=generated.answer,
                not_found=False,
                citations=[self._to_citation(chunk) for chunk in chunks],
                tokens_used=generated.tokens_used,
            )

        return AnswerQuestionResult(
            answer=self._compose_answer(chunks, request.language),
            not_found=False,
            citations=[self._to_citation(chunk) for chunk in chunks],
            tokens_used=0,
        )

    @classmethod
    def _build_retrieval_query(
        cls,
        question: str,
        history: list[ConversationMessage],
    ) -> str:
        """Use history for ambiguous follow-ups, but keep standalone questions clean."""
        current_question = question.strip()
        if not history or not is_follow_up_question(current_question):
            return current_question

        previous_user_question = cls._latest_history_content(history, "user")
        if not previous_user_question:
            return current_question

        parts = [previous_user_question]
        previous_answer = cls._latest_history_content(history, "assistant")
        if previous_answer and not is_insufficient_answer(previous_answer):
            parts.append(cls._truncate_for_retrieval(previous_answer))
        parts.append(current_question)
        return "\n".join(parts)

    @staticmethod
    def _latest_history_content(
        history: list[ConversationMessage],
        role: str,
    ) -> str | None:
        for message in reversed(history):
            if message.role == role:
                return message.content.strip()
        return None

    @staticmethod
    def _truncate_for_retrieval(content: str) -> str:
        normalized = " ".join(content.split())
        if len(normalized) <= _HISTORY_ANSWER_CONTEXT_LIMIT:
            return normalized
        return normalized[:_HISTORY_ANSWER_CONTEXT_LIMIT].rstrip()

    def _retrieve_chunks(
        self,
        request: AnswerQuestionRequest,
        retrieval_query: str,
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        query_embedding = self._embed_question(retrieval_query)
        chunks = self.chunk_repository.search_similar_chunks(
            request.document_ids,
            query_embedding,
            top_k,
        )
        return self._filter_by_similarity_threshold(chunks)

    def _retrieve_keyword_chunks(
        self,
        request: AnswerQuestionRequest,
        query: str,
        top_k: int,
    ) -> list[RetrievedDocumentChunk]:
        keyword_search = getattr(type(self.chunk_repository), "search_keyword_chunks", None)
        if keyword_search is None:
            return []
        return self.chunk_repository.search_keyword_chunks(
            request.document_ids,
            query,
            top_k,
        )

    @staticmethod
    def _merge_retrieved_chunks(
        primary_chunks: list[RetrievedDocumentChunk],
        secondary_chunks: list[RetrievedDocumentChunk],
        limit: int,
    ) -> list[RetrievedDocumentChunk]:
        merged: list[RetrievedDocumentChunk] = []
        seen: set[int] = set()
        for chunk in [*primary_chunks, *secondary_chunks]:
            if chunk.chunk_id in seen:
                continue
            seen.add(chunk.chunk_id)
            merged.append(chunk)
            if len(merged) >= limit:
                break
        return merged

    @classmethod
    def _select_retrieval_top_k(cls, request: AnswerQuestionRequest) -> int:
        """Use enough document context to avoid missing adjacent factual chunks."""
        if is_summary_question(request.question):
            return max(request.top_k, _SUMMARY_TOP_K)
        return max(request.top_k, _DEFAULT_RETRIEVAL_TOP_K)

    def _filter_by_similarity_threshold(
        self,
        chunks: list[RetrievedDocumentChunk],
    ) -> list[RetrievedDocumentChunk]:
        """Drop weak retrieval hits so answers only use sufficiently relevant context."""
        return [
            chunk
            for chunk in chunks
            if chunk.score >= self.similarity_threshold
        ]

    def _embed_question(self, question: str) -> list[float]:
        """Embed a single retrieval query and validate the provider contract."""
        vectors = self.embedding_provider.embed([question])
        if len(vectors) != 1:
            raise ServiceError(
                ErrorCode.EMBEDDING_ERROR,
                "So luong embedding cau hoi khong hop le",
                status_code=502,
                details=[
                    ErrorDetail(
                        field="embedding_count",
                        message=f"Can 1, nhan {len(vectors)}",
                    )
                ],
            )
        return vectors[0]

    @staticmethod
    def _compose_answer(
        chunks: list[RetrievedDocumentChunk],
        language: str,
    ) -> str:
        """Create a compact extractive answer from the highest-ranked chunks."""
        context = "\n\n".join(chunk.content.strip() for chunk in chunks[:3])
        if language == "en":
            return f"Based on the selected document, the relevant content is:\n\n{context}"
        return f"Dựa trên tài liệu đã chọn, nội dung liên quan là:\n\n{context}"

    @staticmethod
    def _not_found_answer(language: str) -> str:
        """Return the standard no-context answer without calling generation."""
        if language == "en":
            return "No relevant information was found in the selected document."
        return "Không tìm thấy thông tin này trong tài liệu đã chọn."

    @staticmethod
    def _to_citation(chunk: RetrievedDocumentChunk) -> AnswerCitation:
        """Convert retrieved DB chunks into citation objects for Backend/Frontend."""
        return AnswerCitation(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            excerpt=AnswerQuestionService._excerpt(
                chunk.content,
                page_number=chunk.page_number,
            ),
            score=chunk.score,
        )

    @staticmethod
    def _excerpt(
        content: str,
        limit: int = _CITATION_EXCERPT_LIMIT,
        page_number: int | None = None,
    ) -> str:
        """Keep citation excerpts readable while preserving real source text."""
        normalized = " ".join(content.split()).strip()
        cleaned = AnswerQuestionService._clean_citation_prefix(normalized, page_number)
        if len(cleaned) <= limit:
            return cleaned

        snippet = cleaned[: limit - 3].rstrip()
        boundary = max(snippet.rfind(". "), snippet.rfind("? "), snippet.rfind("! "), snippet.rfind("; "))
        if boundary >= int(limit * _CITATION_SENTENCE_BOUNDARY_RATIO):
            snippet = snippet[: boundary + 1].rstrip()
        return snippet + "..."

    @staticmethod
    def _clean_citation_prefix(content: str, page_number: int | None) -> str:
        """Remove extraction/page markers that are already shown as citation metadata."""
        cleaned = content.strip(" \"'")
        if page_number is not None and page_number > 0:
            page_prefix = re.compile(
                rf"^(?:trang|page)?\s*{re.escape(str(page_number))}\b[\s:.\-)]*",
                re.IGNORECASE,
            )
            cleaned = page_prefix.sub("", cleaned, count=1).lstrip()

        cleaned = re.sub(
            r"^(?:chunk|doan)\s+\d+\b[\s:.\-)]*",
            "",
            cleaned,
            count=1,
            flags=re.IGNORECASE,
        ).strip(" \"'")
        return cleaned or content
