"""Điều phối luồng hỏi đáp RAG trong phạm vi tài liệu Backend cho phép.

Luồng chính: nhận scope đã kiểm quyền -> tạo retrieval query -> chạy vector và
keyword retrieval -> gộp chunks -> gọi LLM -> tạo citations từ rows thật.

Service này không kiểm JWT/ownership, không lưu conversation và không cho LLM
tự tạo citation. Backend là source of truth cho quyền/history; citations luôn
được map từ ``document_chunks``.

Đọc method ``answer`` trước, rồi đi xuống helper theo đúng thứ tự gọi.
"""

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
    extract_chapter_number,
    is_follow_up_question,
    is_insufficient_answer,
    is_summary_question,
)


_SUMMARY_TOP_K = 8
_DEFAULT_RETRIEVAL_TOP_K = 8
_CHAPTER_CONTEXT_MAX_CHUNKS = 64
_HISTORY_ANSWER_CONTEXT_LIMIT = 500
_CITATION_EXCERPT_LIMIT = 240
_CITATION_SENTENCE_BOUNDARY_RATIO = 0.55


class AnswerQuestionService:
    """Use case trung tâm nối retrieval, generation và citation formatting."""

    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        chunk_repository: DocumentChunkRepository,
        generation_provider: GenerationProvider | None = None,
        similarity_threshold: float | None = None,
    ) -> None:
        """Inject dependency để unit test không cần OpenAI/PostgreSQL thật.

        ``generation_provider`` optional để giữ extractive fallback cho test.
        """
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
        """Trả lời chỉ từ chunks thuộc ``request.document_ids``.

        Đây là bản tóm tắt executable của toàn bộ RAG answer flow.
        """
        chapter_number = extract_chapter_number(request.question)
        chapter_chunks = (
            self.chunk_repository.get_chapter_chunks(
                request.document_ids,
                chapter_number,
                _CHAPTER_CONTEXT_MAX_CHUNKS,
            )
            if chapter_number is not None
            else []
        )
        chunks = chapter_chunks or self._retrieve_hybrid_chunks(request)

        if not chunks:
            # Không context -> không gọi LLM: tránh tốn chi phí và ngăn model
            # dùng kiến thức ngoài tài liệu.
            return AnswerQuestionResult(
                answer=self._not_found_answer(request.language),
                not_found=True,
                citations=[],
                tokens_used=0,
            )

        if self.generation_provider is not None:
            # LLM chỉ nhận question/history/chunks. Citation được map riêng từ
            # chunks thật, không lấy từ output do model tự viết.
            generated = self.generation_provider.generate_answer(
                question=request.question,
                language=request.language,
                history=request.history,
                chunks=chunks,
            )
            if is_insufficient_answer(generated.answer):
                # Retrieval có hit nhưng model tự nhận context chưa đủ: trả
                # not_found và ẩn citation để UI không gây hiểu nhầm.
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

        # Fallback extractive chỉ dùng khi không inject generation provider.
        return AnswerQuestionResult(
            answer=self._compose_answer(chunks, request.language),
            not_found=False,
            citations=[self._to_citation(chunk) for chunk in chunks],
            tokens_used=0,
        )

    def _retrieve_hybrid_chunks(
        self,
        request: AnswerQuestionRequest,
    ) -> list[RetrievedDocumentChunk]:
        """Chạy hybrid retrieval thông thường khi không có chapter range."""
        retrieval_top_k = self._select_retrieval_top_k(request)
        retrieval_query = self._build_retrieval_query(
            request.question,
            request.history,
        )
        vector_chunks = self._retrieve_chunks(
            request,
            retrieval_query,
            retrieval_top_k,
        )
        keyword_chunks = self._retrieve_keyword_chunks(
            request,
            retrieval_query,
            retrieval_top_k,
        )
        return self._merge_retrieved_chunks(
            keyword_chunks,
            vector_chunks,
            retrieval_top_k,
        )

    @classmethod
    def _build_retrieval_query(
        cls,
        question: str,
        history: list[ConversationMessage],
    ) -> str:
        """Dùng history cho follow-up mơ hồ, giữ câu hỏi độc lập sạch.

        ``Chuẩn hóa dữ liệu là gì?`` giữ nguyên. ``Nói chi tiết hơn`` được nối
        với câu hỏi và một phần answer trước để retrieval hiểu đúng chủ đề.
        """
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
        """Lấy message gần nhất theo role vì nó sát chủ đề hiện tại nhất."""
        for message in reversed(history):
            if message.role == role:
                return message.content.strip()
        return None

    @staticmethod
    def _truncate_for_retrieval(content: str) -> str:
        """Giới hạn answer cũ để retrieval query không phình quá lớn."""
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
        """Vector retrieval: embed query -> cosine search -> lọc threshold."""
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
        """Keyword retrieval bổ sung exact phrase cho vector retrieval.

        ``getattr`` giữ compatibility với fake repository cũ trong unit test.
        """
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
        """Gộp hai ranking theo thứ tự ưu tiên và loại trùng bằng chunk_id."""
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
        """Lấy đủ context để không bỏ sót chunk liền kề hoặc ý chính."""
        if is_summary_question(request.question):
            return max(request.top_k, _SUMMARY_TOP_K)
        return max(request.top_k, _DEFAULT_RETRIEVAL_TOP_K)

    def _filter_by_similarity_threshold(
        self,
        chunks: list[RetrievedDocumentChunk],
    ) -> list[RetrievedDocumentChunk]:
        """Loại vector hit yếu trước khi đưa context sang model.

        Keyword result đã có ranking/score riêng nên không qua filter này.
        """
        return [
            chunk
            for chunk in chunks
            if chunk.score >= self.similarity_threshold
        ]

    def _embed_question(self, question: str) -> list[float]:
        """Embed đúng một query và kiểm tra provider trả đúng một vector."""
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
        """Fallback extractive khi không có generation provider."""
        context = "\n\n".join(chunk.content.strip() for chunk in chunks[:3])
        if language == "en":
            return f"Based on the selected document, the relevant content is:\n\n{context}"
        return f"Dựa trên tài liệu đã chọn, nội dung liên quan là:\n\n{context}"

    @staticmethod
    def _not_found_answer(language: str) -> str:
        """Câu trả lời chuẩn khi không có context; không gọi generation."""
        if language == "en":
            return "No relevant information was found in the selected document."
        return "Không tìm thấy thông tin này trong tài liệu đã chọn."

    @staticmethod
    def _to_citation(chunk: RetrievedDocumentChunk) -> AnswerCitation:
        """Map DB chunk thật thành citation cho Backend/Frontend."""
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
        """Rút excerpt dễ đọc nhưng vẫn giữ nguyên nội dung nguồn thật."""
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
        """Bỏ prefix page/chunk đã được UI hiển thị riêng trong metadata."""
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
