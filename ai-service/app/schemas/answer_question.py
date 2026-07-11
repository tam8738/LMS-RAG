"""Request/response contract for the internal RAG question endpoint."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings


class AnswerQuestionRequest(BaseModel):
    """Payload Backend sends after it has checked document permissions."""

    model_config = ConfigDict(extra="forbid")

    document_ids: list[int] = Field(min_length=1, max_length=10)
    question: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default_factory=lambda: settings.default_top_k, ge=1, le=8)
    language: Literal["vi", "en"] = "vi"

    @field_validator("document_ids")
    @classmethod
    def document_ids_must_be_positive(cls, value: list[int]) -> list[int]:
        """Keep order but remove duplicates because retrieval only needs each scope once."""
        cleaned: list[int] = []
        seen: set[int] = set()
        for document_id in value:
            if document_id <= 0:
                raise ValueError("document_ids phải lớn hơn 0")
            if document_id not in seen:
                seen.add(document_id)
                cleaned.append(document_id)
        return cleaned

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        """Normalize outer whitespace and reject visually empty questions."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("question không được để trống")
        return stripped


class AnswerCitation(BaseModel):
    """A citation is always backed by a real row from document_chunks."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: int = Field(gt=0)
    document_id: int = Field(gt=0)
    page_number: int | None = Field(default=None, ge=1)
    chunk_index: int = Field(ge=0)
    excerpt: str = Field(min_length=1)
    score: float = Field(ge=0)


class AnswerQuestionResult(BaseModel):
    """Response body consumed by Backend RAG proxy."""

    model_config = ConfigDict(extra="forbid")

    answer: str = Field(min_length=1)
    not_found: bool
    citations: list[AnswerCitation]
    tokens_used: int = Field(ge=0)