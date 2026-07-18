"""OpenAI chat implementation for grounded RAG answers."""

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

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError
from app.generation.base import GeneratedAnswer, GenerationProvider
from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk
from app.utils.question_intent import is_summary_question

_SUMMARY_MAX_TOKENS = 700
_DEFAULT_MAX_TOKENS = 500

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
            "For summary or main-points questions, cover all major ideas present "
            "in the supplied context and group related ideas into a coherent outline. "
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

    @classmethod
    def _select_max_tokens(cls, question: str) -> int:
        if is_summary_question(question):
            return _SUMMARY_MAX_TOKENS
        return _DEFAULT_MAX_TOKENS

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
    def _parse_response(response: Any) -> GeneratedAnswer:
        try:
            answer = response.choices[0].message.content.strip()
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

    def _validate_configuration(self) -> None:
        if self.max_retries < 0:
            raise ValueError("generation max_retries must not be negative")
        if self.retry_base_delay_seconds < 0:
            raise ValueError("generation retry delay must not be negative")
        if self.request_timeout_seconds <= 0:
            raise ValueError("generation request timeout must be positive")
