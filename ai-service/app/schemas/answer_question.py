"""Contract request/response cho endpoint RAG nội bộ."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import settings

_MAX_HISTORY_CONTENT_CHARS = 2000


class ConversationMessage(BaseModel):
    """Một lượt chat cũ Backend gửi sang để AI hiểu follow-up stateless."""

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=_MAX_HISTORY_CONTENT_CHARS)

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        """Trim/cắt history dài để câu hỏi mới không bị Pydantic từ chối."""
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("history.content must not be blank")
        return stripped[:_MAX_HISTORY_CONTENT_CHARS].rstrip()


class AnswerQuestionRequest(BaseModel):
    """Payload Backend gửi sau khi kiểm quyền và trạng thái document."""

    model_config = ConfigDict(extra="forbid")

    document_ids: list[int] = Field(min_length=1, max_length=10)
    question: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default_factory=lambda: settings.default_top_k, ge=1, le=8)
    language: Literal["vi", "en"] = "vi"
    history: list[ConversationMessage] = Field(default_factory=list, max_length=6)

    @field_validator("document_ids")
    @classmethod
    def document_ids_must_be_positive(cls, value: list[int]) -> list[int]:
        """Giữ thứ tự nhưng bỏ duplicate vì mỗi document chỉ cần search một lần."""
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
        """Trim whitespace ngoài và từ chối câu hỏi nhìn như rỗng."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("question không được để trống")
        return stripped


class AnswerCitation(BaseModel):
    """Citation luôn được tạo từ một row thật trong ``document_chunks``."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: int = Field(gt=0)
    document_id: int = Field(gt=0)
    page_number: int | None = Field(default=None, ge=1)
    chunk_index: int = Field(ge=0)
    excerpt: str = Field(min_length=1)
    score: float = Field(ge=0)


class AnswerQuestionResult(BaseModel):
    """Kết quả Backend RAG proxy lưu vào conversation và trả Frontend."""

    model_config = ConfigDict(extra="forbid")

    answer: str = Field(min_length=1)
    not_found: bool
    citations: list[AnswerCitation]
    tokens_used: int = Field(ge=0)