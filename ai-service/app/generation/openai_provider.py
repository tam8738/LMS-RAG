"""OpenAI chat implementation for grounded RAG answers."""

import json
import re
import time
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)

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


class _RawQuizQuestion(BaseModel):
    """Minimal JSON shape requested from the LLM before citation mapping."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    options: list[QuizOption] = Field(min_length=2, max_length=4)
    correct_option_ids: list[str] = Field(min_length=1, max_length=1)
    explanation: str = Field(min_length=1)
    source_chunk_ids: list[int] = Field(min_length=1, max_length=3)


class _RawQuiz(BaseModel):
    """LLM JSON response before conversion to the public AI contract."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    questions: list[_RawQuizQuestion] = Field(min_length=1, max_length=10)


_RETRYABLE_EXCEPTIONS = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


class OpenAIGenerationProvider(GenerationProvider):
    """Generate concise grounded answers with retry and output validation."""

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
            self.client = client
        else:
            selected_api_key = api_key or settings.openai_api_key
            if not selected_api_key:
                raise ValueError("OPENAI_API_KEY is not configured")
            self.client = OpenAI(api_key=selected_api_key, max_retries=0)

    def generate_answer(
        self,
        *,
        question: str,
        language: str,
        history: list[ConversationMessage],
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedAnswer:
        """Call OpenAI with retrieved context and return a validated answer."""
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
        """Call OpenAI and return a validated structured quiz draft."""
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
        language_name = "Vietnamese" if language == "vi" else "English"
        system_prompt = (
            "You are a teaching assistant for an LMS RAG system. "
            "Generate a teacher-reviewable quiz draft only from the supplied document context. "
            "Do not use outside knowledge. Do not invent facts. "
            f"Write the quiz in {language_name}. "
            "Return only a valid JSON object, without Markdown or code fences. "
            "Use only single_choice questions. Each question must have 4 options with ids A, B, C, D, "
            "exactly one correct_option_ids item, a short explanation grounded in context, "
            "and source_chunk_ids containing existing chunk_id values from the context."
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
                "      \"source_chunk_ids\": [123]\n"
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
        if is_summary_question(question):
            return self.summary_max_tokens
        return self.default_max_tokens

    @staticmethod
    def _format_history(history: list[ConversationMessage]) -> str:
        if not history:
            return "Conversation history:\n(none)"

        lines = ["Conversation history:"]
        for message in history:
            label = "User" if message.role == "user" else "Assistant"
            lines.append(f"{label}: {message.content}")
        return "\n".join(lines)

    @staticmethod
    def _format_context(chunks: list[RetrievedDocumentChunk]) -> str:
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
        questions: list[QuizQuestion] = []
        for raw_question in raw_quiz.questions:
            citations = OpenAIGenerationProvider._map_quiz_citations(
                raw_question.source_chunk_ids,
                chunk_by_id,
            )
            questions.append(
                QuizQuestion(
                    question=OpenAIGenerationProvider._clean_answer_text(raw_question.question),
                    options=raw_question.options,
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
    ) -> list[QuizCitation]:
        citations: list[QuizCitation] = []
        seen: set[int] = set()
        for chunk_id in source_chunk_ids:
            if chunk_id in seen:
                continue
            chunk = chunk_by_id.get(chunk_id)
            if chunk is None:
                raise ServiceError(
                    ErrorCode.INVALID_OUTPUT,
                    "OpenAI referenced a chunk outside the supplied quiz context",
                    status_code=502,
                )
            seen.add(chunk_id)
            citations.append(
                QuizCitation(
                    chunk_id=chunk.chunk_id,
                    document_id=chunk.document_id,
                    page_number=chunk.page_number,
                    chunk_index=chunk.chunk_index,
                    excerpt=OpenAIGenerationProvider._excerpt(chunk.content),
                )
            )
        return citations

    @staticmethod
    def _excerpt(content: str, limit: int = 300) -> str:
        normalized = " ".join(content.split()).strip()
        if len(normalized) <= limit:
            return normalized
        return normalized[:limit].rsplit(" ", 1)[0].rstrip() + "..."
    @staticmethod
    def _parse_response(response: Any) -> GeneratedAnswer:
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
        cleaned = _MARKDOWN_HEADING_PATTERN.sub("", answer.strip())
        cleaned = _MARKDOWN_EMPHASIS_PATTERN.sub(r"\2", cleaned)
        return cleaned.strip()

    def _validate_configuration(self) -> None:
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