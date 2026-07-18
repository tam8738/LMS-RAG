"""Application service for document-scoped RAG question answering."""

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.embeddings.base import EmbeddingProvider
from app.generation.base import GenerationProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.answer_question import (
    AnswerCitation,
    AnswerQuestionRequest,
    AnswerQuestionResult,
)
from app.schemas.document import RetrievedDocumentChunk
from app.utils.question_intent import is_summary_question


_SUMMARY_TOP_K = 8


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
            raise ValueError("similarity_threshold ph\u1ea3i n\u1eb1m trong kho\u1ea3ng 0.0 \u0111\u1ebfn 1.0")

    def answer(self, request: AnswerQuestionRequest) -> AnswerQuestionResult:
        """Answer only from retrieved chunks inside Backend-authorized documents."""
        retrieval_query = self._build_retrieval_query(request)
        retrieval_top_k = self._select_retrieval_top_k(request)
        chunks = self._retrieve_chunks(request, retrieval_query, retrieval_top_k)

        if not chunks and request.history:
            chunks = self._retrieve_chunks(request, request.question, retrieval_top_k)

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

    @classmethod
    def _select_retrieval_top_k(cls, request: AnswerQuestionRequest) -> int:
        """Use broader context for document summary questions."""
        if is_summary_question(request.question):
            return max(request.top_k, _SUMMARY_TOP_K)
        return request.top_k

    def _build_retrieval_query(self, request: AnswerQuestionRequest) -> str:
        """Combine recent chat history with the current question for stateless retrieval."""
        if not request.history:
            return request.question

        lines = ["Previous conversation:"]
        for message in request.history:
            label = "User" if message.role == "user" else "Assistant"
            lines.append(f"{label}: {message.content}")
        lines.append(f"Current question: {request.question}")
        return "\n".join(lines)

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
        """Embed a single question and validate the provider contract."""
        vectors = self.embedding_provider.embed([question])
        if len(vectors) != 1:
            raise ServiceError(
                ErrorCode.EMBEDDING_ERROR,
                "S\u1ed1 l\u01b0\u1ee3ng embedding c\u00e2u h\u1ecfi kh\u00f4ng h\u1ee3p l\u1ec7",
                status_code=502,
                details=[
                    ErrorDetail(
                        field="embedding_count",
                        message=f"C\u1ea7n 1, nh\u1eadn {len(vectors)}",
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
        return f"D\u1ef1a tr\u00ean t\u00e0i li\u1ec7u \u0111\u00e3 ch\u1ecdn, n\u1ed9i dung li\u00ean quan l\u00e0:\n\n{context}"

    @staticmethod
    def _not_found_answer(language: str) -> str:
        """Return the standard no-context answer without calling generation."""
        if language == "en":
            return "No relevant information was found in the selected document."
        return "Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin n\u00e0y trong t\u00e0i li\u1ec7u \u0111\u00e3 ch\u1ecdn."

    @staticmethod
    def _to_citation(chunk: RetrievedDocumentChunk) -> AnswerCitation:
        """Convert retrieved DB chunks into citation objects for Backend/Frontend."""
        return AnswerCitation(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            excerpt=AnswerQuestionService._excerpt(chunk.content),
            score=chunk.score,
        )

    @staticmethod
    def _excerpt(content: str, limit: int = 280) -> str:
        """Keep citation excerpts short while preserving real source text."""
        normalized = " ".join(content.split())
        if len(normalized) <= limit:
            return normalized
        return normalized[: limit - 3].rstrip() + "..."
