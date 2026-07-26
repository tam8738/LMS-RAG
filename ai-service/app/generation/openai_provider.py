"""OpenAI implementation cho grounded answer và quiz draft.

File này là ranh giới giữa code đáng tin cậy và output không hoàn toàn đáng tin
cậy của LLM. Vì vậy provider làm đủ bốn việc:

1. Build prompt chỉ chứa context đã retrieval trong scope cho phép.
2. Gọi OpenAI với timeout/retry có giới hạn.
3. Parse và validate output trước khi trả về application service.
4. Làm sạch text và map citation về chunk thật trong database.

Luồng answer trả plain text; citation được tạo bên ngoài provider từ retrieved
chunks. Luồng quiz yêu cầu JSON có ``source_chunk_ids`` rồi provider tự map các
ID đó về metadata nguồn thật. Model không được tự quyết định page/excerpt.
"""

import json
import re
import time
from collections.abc import Callable
from typing import Any

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError
from app.generation.base import GeneratedAnswer, GeneratedQuiz, GenerationProvider
from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk
from app.schemas.generate_quiz import (
    GenerateQuizResult,
    QuizCitation,
    QuizOption,
    QuizQuestion,
)
from app.utils.question_intent import is_summary_question

_FALLBACK_SUMMARY_MAX_TOKENS = 1200
_FALLBACK_DEFAULT_MAX_TOKENS = 700
_FALLBACK_QUIZ_MAX_TOKENS = 1800
_MARKDOWN_EMPHASIS_PATTERN = re.compile(r"(\*\*\*|\*\*|___|__)(.+?)\1")
_MARKDOWN_HEADING_PATTERN = re.compile(r"^\s{0,3}#{1,6}\s+", re.MULTILINE)
_MOJIBAKE_MARKERS = (
    "\u00c3",
    "\u00c2",
    "\u00c6",
    "\u00e1\u00ba",
    "\u00e1\u00bb",
    "\u00c4",
    "\u00c5",
)
_REPLACEMENT_CHARACTER = "\ufffd"

_RETRYABLE_EXCEPTIONS = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


class _RawQuizQuestion(BaseModel):
    """JSON thô yêu cầu từ LLM trước khi map source_chunk_ids."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    options: list[QuizOption] = Field(min_length=2, max_length=4)
    correct_option_ids: list[str] = Field(min_length=1, max_length=1)
    explanation: str = Field(min_length=1)
    source_chunk_ids: list[int] = Field(min_length=1, max_length=3)


class _RawQuiz(BaseModel):
    """Toàn bộ JSON thô trước khi chuyển sang contract GenerateQuizResult."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    questions: list[_RawQuizQuestion] = Field(min_length=1, max_length=10)


class OpenAIGenerationProvider(GenerationProvider):
    """Sinh answer grounded và quiz draft có cấu trúc qua OpenAI chat API."""

    def __init__(
        self,
        client: Any | None = None,
        *,
        api_key: str | None = None,
        model_name: str | None = None,
        max_retries: int | None = None,
        retry_base_delay_seconds: float | None = None,
        request_timeout_seconds: float | None = None,
        default_max_tokens: int | None = None,
        summary_max_tokens: int | None = None,
        quiz_max_tokens: int | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        """Khởi tạo bằng settings production hoặc dependency giả trong test.

        ``sleep`` được inject để test exponential backoff mà không chờ thật.
        Ba token limits tách answer thường, summary và quiz vì độ dài khác nhau.
        """
        super().__init__(model_name or settings.generation_model)
        self.max_retries = (
            max_retries
            if max_retries is not None
            else settings.generation_max_retries
        )
        self.retry_base_delay_seconds = (
            retry_base_delay_seconds
            if retry_base_delay_seconds is not None
            else settings.generation_retry_base_delay_seconds
        )
        self.request_timeout_seconds = (
            request_timeout_seconds
            if request_timeout_seconds is not None
            else settings.generation_request_timeout_seconds
        )
        self.default_max_tokens = (
            default_max_tokens
            if default_max_tokens is not None
            else getattr(settings, "generation_default_max_tokens", _FALLBACK_DEFAULT_MAX_TOKENS)
        )
        self.summary_max_tokens = (
            summary_max_tokens
            if summary_max_tokens is not None
            else getattr(settings, "generation_summary_max_tokens", _FALLBACK_SUMMARY_MAX_TOKENS)
        )
        self.quiz_max_tokens = (
            quiz_max_tokens
            if quiz_max_tokens is not None
            else getattr(settings, "generation_quiz_max_tokens", _FALLBACK_QUIZ_MAX_TOKENS)
        )
        self._validate_configuration()
        self._sleep = sleep

        if client is not None:
            # Unit test truyền MagicMock để không gọi mạng hoặc tốn token.
            self.client = client
        else:
            selected_api_key = api_key or settings.openai_api_key
            if not selected_api_key:
                raise ValueError("OPENAI_API_KEY is not configured")
            # Tắt retry của SDK vì provider đã tự quản lý retry/backoff.
            self.client = OpenAI(api_key=selected_api_key, max_retries=0)

    def generate_answer(
        self,
        *,
        question: str,
        language: str,
        history: list[ConversationMessage],
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedAnswer:
        """Gọi OpenAI bằng context retrieval rồi parse answer an toàn."""
        if not question.strip():
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Question used for generation must not be blank",
                status_code=422,
            )
        if not chunks:
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Generation requires at least one retrieved chunk",
                status_code=422,
            )

        response = self._request_completion(
            question=question.strip(),
            language=language,
            history=history,
            chunks=chunks,
        )
        return self._parse_response(response)

    def generate_quiz(
        self,
        *,
        document_ids: list[int],
        question_count: int,
        language: str,
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedQuiz:
        """Gọi OpenAI và trả quiz draft đã validate/citation mapping."""
        if not document_ids or any(document_id <= 0 for document_id in document_ids):
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Quiz generation requires valid document_ids",
                status_code=422,
            )
        if question_count <= 0:
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "question_count must be greater than 0",
                status_code=422,
            )
        if language not in {"vi", "en"}:
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "language must be vi or en",
                status_code=422,
            )
        if not chunks:
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Quiz generation requires document chunks",
                status_code=422,
            )

        response = self._request_quiz_completion(
            document_ids=document_ids,
            question_count=question_count,
            language=language,
            chunks=chunks,
        )
        quiz = self._parse_quiz_response(
            response,
            question_count=question_count,
            chunks=chunks,
        )
        return GeneratedQuiz(quiz=quiz)

    def _request_quiz_completion(
        self,
        *,
        document_ids: list[int],
        question_count: int,
        language: str,
        chunks: list[RetrievedDocumentChunk],
    ) -> Any:
        """Gọi chat completion cho quiz với retry và JSON mode."""
        messages = self._build_quiz_messages(
            document_ids=document_ids,
            question_count=question_count,
            language=language,
            chunks=chunks,
        )
        for retry_number in range(self.max_retries + 1):
            try:
                return self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=self.quiz_max_tokens,
                    timeout=self.request_timeout_seconds,
                    # JSON mode giảm lỗi parse nhưng vẫn phải validate Pydantic.
                    response_format={"type": "json_object"},
                )
            except _RETRYABLE_EXCEPTIONS as exc:
                if retry_number >= self.max_retries:
                    raise ServiceError(
                        ErrorCode.PROVIDER_UNAVAILABLE,
                        "OpenAI generation provider is temporarily unavailable",
                        status_code=503,
                    ) from exc
                delay = self.retry_base_delay_seconds * (2**retry_number)
                self._sleep(delay)
            except Exception as exc:
                raise ServiceError(
                    ErrorCode.GENERATION_ERROR,
                    "Could not generate quiz from OpenAI",
                    status_code=502,
                ) from exc

        raise AssertionError("Retry loop must always return or raise")

    def _request_completion(
        self,
        *,
        question: str,
        language: str,
        history: list[ConversationMessage],
        chunks: list[RetrievedDocumentChunk],
    ) -> Any:
        """Gọi chat completion cho answer với token limit theo intent."""
        messages = self._build_messages(
            question=question,
            language=language,
            history=history,
            chunks=chunks,
        )
        for retry_number in range(self.max_retries + 1):
            try:
                return self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=self._select_max_tokens(question),
                    timeout=self.request_timeout_seconds,
                )
            except _RETRYABLE_EXCEPTIONS as exc:
                if retry_number >= self.max_retries:
                    raise ServiceError(
                        ErrorCode.PROVIDER_UNAVAILABLE,
                        "OpenAI generation provider is temporarily unavailable",
                        status_code=503,
                    ) from exc
                delay = self.retry_base_delay_seconds * (2**retry_number)
                self._sleep(delay)
            except Exception as exc:
                raise ServiceError(
                    ErrorCode.GENERATION_ERROR,
                    "Could not generate answer from OpenAI",
                    status_code=502,
                ) from exc

        raise AssertionError("Retry loop must always return or raise")

    def _build_quiz_messages(
        self,
        *,
        document_ids: list[int],
        question_count: int,
        language: str,
        chunks: list[RetrievedDocumentChunk],
    ) -> list[dict[str, str]]:
        """Build system/user prompt bắt model trả đúng quiz JSON schema.

        Prompt chỉ cho model tham chiếu ``source_chunk_ids``. Metadata citation
        thật sẽ được code Python map sau khi nhận response.
        """
        language_name = "Vietnamese" if language == "vi" else "English"
        system_prompt = (
            "You are a teaching assistant for an LMS RAG system. "
            "Generate a teacher-reviewable quiz draft only from the supplied document context. "
            "Do not use outside knowledge. Do not invent facts. "
            f"Write the quiz in {language_name}. "
            "Return only a valid JSON object, without Markdown or code fences. "
            "Use only single_choice questions. Each question must have 4 options with ids A, B, C, D, "
            "exactly one correct_option_ids item, a short explanation grounded in context, "
            "and source_chunk_ids containing existing chunk_id values from the context. "
            "Do not use the bracketed context number unless you cannot identify the chunk_id."
        )
        user_prompt = "\n\n".join(
            [
                f"Authorized document_ids: {document_ids}",
                f"Question count: {question_count}",
                "Required JSON shape:\n"
                "{\n"
                "  \"title\": \"...\",\n"
                "  \"description\": \"...\",\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": \"...\",\n"
                "      \"options\": [{\"id\": \"A\", \"text\": \"...\"}, ...],\n"
                "      \"correct_option_ids\": [\"A\"],\n"
                "      \"explanation\": \"...\",\n"
                "      \"source_chunk_ids\": [actual_chunk_id_from_context]\n"
                "    }\n"
                "  ]\n"
                "}",
                self._format_context(chunks),
            ]
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _build_messages(
        self,
        *,
        question: str,
        language: str,
        history: list[ConversationMessage],
        chunks: list[RetrievedDocumentChunk],
    ) -> list[dict[str, str]]:
        """Build prompt answer gồm history stateless, context và question.

        System prompt khóa model vào context; user prompt chứa dữ liệu cụ thể
        của request hiện tại. Tách hai phần giúp rule ít bị lẫn với tài liệu.
        """
        language_name = "Vietnamese" if language == "vi" else "English"
        system_prompt = (
            "You are a teaching assistant for an LMS RAG system. "
            "Answer only from the supplied document context. "
            "Do not use outside knowledge. Do not invent citations; the UI "
            "shows citations separately from retrieved chunks. "
            f"Reply in {language_name}. Keep the answer clear and concise. "
            "Use plain text only. Do not use Markdown syntax such as **bold**, "
            "headings, code fences, or table formatting. Plain numbered lists are allowed. "
            "For summary or main-points questions, cover all major ideas present "
            "in the supplied context and group related ideas into a coherent outline. "
            "For short follow-up questions, use the conversation history to infer "
            "what the user wants elaborated, but still answer only from context. "
            "If the context is insufficient, say that the selected document "
            "does not contain enough information."
        )
        user_prompt = "\n\n".join(
            [
                self._format_history(history),
                self._format_context(chunks),
                f"Question:\n{question}",
            ]
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _select_max_tokens(self, question: str) -> int:
        """Summary được budget dài hơn answer fact thông thường."""
        if is_summary_question(question):
            return self.summary_max_tokens
        return self.default_max_tokens

    @staticmethod
    def _format_history(history: list[ConversationMessage]) -> str:
        """Đổi tối đa sáu messages thành text prompt; provider không lưu lại."""
        if not history:
            return "Conversation history:\n(none)"

        lines = ["Conversation history:"]
        for message in history:
            label = "User" if message.role == "user" else "Assistant"
            lines.append(f"{label}: {message.content}")
        return "\n".join(lines)

    @staticmethod
    def _format_context(chunks: list[RetrievedDocumentChunk]) -> str:
        """Đóng gói text cùng IDs nguồn để model hiểu và quiz trỏ lại chunk.

        Context index ``[1]`` chỉ là số thứ tự trong prompt; ``chunk_id`` mới
        là primary key thật. Parser quiz hỗ trợ cả hai để chịu lỗi model.
        """
        lines = ["Document context:"]
        for index, chunk in enumerate(chunks, start=1):
            page = f", page={chunk.page_number}" if chunk.page_number else ""
            lines.append(
                (
                    f"[{index}] document_id={chunk.document_id}, "
                    f"chunk_id={chunk.chunk_id}, chunk_index={chunk.chunk_index}"
                    f"{page}, score={chunk.score:.3f}\n"
                    f"{chunk.content.strip()}"
                )
            )
        return "\n\n".join(lines)

    @staticmethod
    def _parse_quiz_response(
        response: Any,
        *,
        question_count: int,
        chunks: list[RetrievedDocumentChunk],
    ) -> GenerateQuizResult:
        """Parse response SDK -> JSON -> raw schema -> public quiz schema.

        Hai lớp schema là chủ ý: raw schema phản ánh thứ model được phép trả;
        public schema chứa citations đã được code map và text đã làm sạch.
        """
        try:
            content = response.choices[0].message.content
            payload = json.loads(content)
            raw_quiz = _RawQuiz.model_validate(payload)
        except (json.JSONDecodeError, ValidationError, Exception) as exc:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI returned malformed quiz output",
                status_code=502,
            ) from exc

        if len(raw_quiz.questions) != question_count:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI returned an unexpected number of quiz questions",
                status_code=502,
            )

        chunk_by_id = {chunk.chunk_id: chunk for chunk in chunks}
        chunk_by_context_index = {
            index: chunk for index, chunk in enumerate(chunks, start=1)
        }
        questions: list[QuizQuestion] = []
        for raw_question in raw_quiz.questions:
            citations = OpenAIGenerationProvider._map_quiz_citations(
                raw_question.source_chunk_ids,
                chunk_by_id,
                chunk_by_context_index,
                chunks[0],
            )
            questions.append(
                QuizQuestion(
                    question=OpenAIGenerationProvider._clean_answer_text(raw_question.question),
                    options=OpenAIGenerationProvider._clean_quiz_options(raw_question.options),
                    correct_option_ids=raw_question.correct_option_ids,
                    explanation=OpenAIGenerationProvider._clean_answer_text(raw_question.explanation),
                    citations=citations,
                )
            )

        usage = getattr(response, "usage", None)
        tokens_used = int(getattr(usage, "total_tokens", 0) or 0)
        if tokens_used < 0:
            tokens_used = 0

        try:
            return GenerateQuizResult(
                title=OpenAIGenerationProvider._clean_answer_text(raw_quiz.title),
                description=OpenAIGenerationProvider._clean_answer_text(raw_quiz.description),
                questions=questions,
                tokens_used=tokens_used,
            )
        except ValidationError as exc:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI returned invalid quiz content",
                status_code=502,
            ) from exc

    @staticmethod
    def _map_quiz_citations(
        source_chunk_ids: list[int],
        chunk_by_id: dict[int, RetrievedDocumentChunk],
        chunk_by_context_index: dict[int, RetrievedDocumentChunk],
        fallback_chunk: RetrievedDocumentChunk,
    ) -> list[QuizCitation]:
        """Map IDs model trả về sang chunks thật và loại citation trùng.

        Model đôi khi trả số thứ tự ``[1]`` thay vì ``chunk_id`` nên thử cả
        hai map. Nếu không ID nào hợp lệ, fallback một chunk thật để response
        không chứa nguồn bịa; Teacher vẫn phải review draft trước publish.
        """
        citations: list[QuizCitation] = []
        seen: set[int] = set()

        for source_id in source_chunk_ids:
            chunk = chunk_by_id.get(source_id) or chunk_by_context_index.get(source_id)
            if chunk is None or chunk.chunk_id in seen:
                continue

            seen.add(chunk.chunk_id)
            citations.append(OpenAIGenerationProvider._to_quiz_citation(chunk))

        if not citations:
            citations.append(OpenAIGenerationProvider._to_quiz_citation(fallback_chunk))

        return citations

    @staticmethod
    def _to_quiz_citation(chunk: RetrievedDocumentChunk) -> QuizCitation:
        """Chỉ lấy metadata từ RetrievedDocumentChunk, không lấy từ LLM."""
        return QuizCitation(
            chunk_id=chunk.chunk_id,
            document_id=chunk.document_id,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            excerpt=OpenAIGenerationProvider._excerpt(chunk.content),
        )

    @staticmethod
    def _excerpt(content: str, limit: int = 300) -> str:
        """Repair encoding, normalize whitespace và cắt excerpt citation."""
        repaired = OpenAIGenerationProvider._repair_mojibake(content)
        normalized = " ".join(repaired.split()).strip()
        if len(normalized) <= limit:
            return normalized
        return normalized[:limit].rsplit(" ", 1)[0].rstrip() + "..."

    @staticmethod
    def _parse_response(response: Any) -> GeneratedAnswer:
        """Lấy answer/token usage và chặn response rỗng hoặc sai cấu trúc."""
        try:
            content = response.choices[0].message.content
            answer = OpenAIGenerationProvider._clean_answer_text(content)
        except Exception as exc:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI returned malformed generation output",
                status_code=502,
            ) from exc

        if not answer:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI returned an empty answer",
                status_code=502,
            )

        usage = getattr(response, "usage", None)
        tokens_used = int(getattr(usage, "total_tokens", 0) or 0)
        if tokens_used < 0:
            tokens_used = 0

        return GeneratedAnswer(answer=answer, tokens_used=tokens_used)

    @staticmethod
    def _clean_answer_text(answer: str) -> str:
        """Chuẩn hóa text ở output boundary trước khi trả Backend.

        Chỉ bỏ heading/emphasis Markdown; numbered list plain text vẫn giữ.
        """
        repaired = OpenAIGenerationProvider._repair_mojibake(answer)
        cleaned = _MARKDOWN_HEADING_PATTERN.sub("", repaired.strip())
        cleaned = _MARKDOWN_EMPHASIS_PATTERN.sub(r"\2", cleaned)
        return cleaned.strip()

    @staticmethod
    def _clean_quiz_options(options: list[QuizOption]) -> list[QuizOption]:
        """Áp dụng cùng cleanup cho từng lựa chọn A-D."""
        return [
            QuizOption(id=option.id, text=OpenAIGenerationProvider._clean_answer_text(option.text))
            for option in options
        ]

    @staticmethod
    def _repair_mojibake(text: str) -> str:
        """Thử đảo lỗi UTF-8 bị decode nhầm Latin-1, tối đa hai vòng.

        Hàm chỉ chấp nhận candidate không làm tăng ký tự replacement ``�``.
        Đây là repair ở output boundary; raw chunks trong DB không bị sửa.
        """
        if not text:
            return text

        repaired = text
        for _ in range(2):
            if not OpenAIGenerationProvider._looks_like_mojibake(repaired):
                break
            try:
                candidate = repaired.encode("latin1").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
            if candidate == repaired:
                break
            if candidate.count(_REPLACEMENT_CHARACTER) > repaired.count(_REPLACEMENT_CHARACTER):
                break
            repaired = candidate
        return repaired

    @staticmethod
    def _looks_like_mojibake(text: str) -> bool:
        """Nhận diện marker phổ biến trước khi thử encode/decode có rủi ro."""
        has_control = any("\u0080" <= character <= "\u009f" for character in text)
        return has_control or any(marker in text for marker in _MOJIBAKE_MARKERS)

    def _validate_configuration(self) -> None:
        """Fail fast khi retry/timeout/token budget không hợp lệ."""
        if self.max_retries < 0:
            raise ValueError("generation max_retries must not be negative")
        if self.retry_base_delay_seconds < 0:
            raise ValueError("generation retry delay must be non-negative")
        if self.request_timeout_seconds <= 0:
            raise ValueError("generation request timeout must be positive")
        if self.default_max_tokens <= 0:
            raise ValueError("generation default max tokens must be positive")
        if self.summary_max_tokens <= 0:
            raise ValueError("generation summary max tokens must be positive")
        if self.quiz_max_tokens <= 0:
            raise ValueError("generation quiz max tokens must be positive")
