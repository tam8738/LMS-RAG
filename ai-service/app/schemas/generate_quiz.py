"""Contract request/response cho tính năng sinh quiz draft nội bộ."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.config import settings


class GenerateQuizRequest(BaseModel):
    """Payload Backend gửi sau khi kiểm Teacher và document đã index."""

    model_config = ConfigDict(extra="forbid")

    document_ids: list[int] = Field(min_length=1, max_length=10)
    question_count: int = Field(default=5, ge=1, le=20)
    language: Literal["vi", "en"] = "vi"
    max_context_chunks: int = Field(default_factory=lambda: settings.quiz_context_chunks, ge=3, le=24)

    @field_validator("document_ids")
    @classmethod
    def document_ids_must_be_positive(cls, value: list[int]) -> list[int]:
        """Bỏ duplicate IDs để context scope gọn và xác định."""
        cleaned: list[int] = []
        seen: set[int] = set()
        for document_id in value:
            if document_id <= 0:
                raise ValueError("document_ids must be greater than 0")
            if document_id not in seen:
                seen.add(document_id)
                cleaned.append(document_id)
        return cleaned


class QuizOption(BaseModel):
    """Một lựa chọn A-D trong câu hỏi single-choice."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=1, pattern="^[A-D]$")
    text: str = Field(min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("option text must not be blank")
        return stripped


class QuizCitation(BaseModel):
    """Chunk nguồn thật dùng để kiểm chứng câu hỏi được sinh."""

    model_config = ConfigDict(extra="forbid")

    chunk_id: int = Field(gt=0)
    document_id: int = Field(gt=0)
    page_number: int | None = Field(default=None, ge=1)
    chunk_index: int = Field(ge=0)
    excerpt: str = Field(min_length=1, max_length=500)


class QuizQuestion(BaseModel):
    """Câu hỏi draft mà Teacher có thể review/chỉnh sửa."""

    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=1000)
    type: Literal["single_choice"] = "single_choice"
    options: list[QuizOption] = Field(min_length=2, max_length=4)
    correct_option_ids: list[str] = Field(min_length=1, max_length=1)
    explanation: str = Field(min_length=1, max_length=1200)
    citations: list[QuizCitation] = Field(default_factory=list, max_length=3)

    @field_validator("question", "explanation")
    @classmethod
    def text_fields_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text must not be blank")
        return stripped

    @model_validator(mode="after")
    def correct_options_must_exist(self) -> "QuizQuestion":
        option_ids = {option.id for option in self.options}
        missing_ids = [option_id for option_id in self.correct_option_ids if option_id not in option_ids]
        if missing_ids:
            raise ValueError("correct_option_ids must reference existing options")
        return self


class GenerateQuizResult(BaseModel):
    """Quiz draft hoàn chỉnh để Backend persist và Teacher review."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    questions: list[QuizQuestion] = Field(min_length=1, max_length=20)
    tokens_used: int = Field(ge=0)

    @field_validator("title", "description")
    @classmethod
    def metadata_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("quiz metadata must not be blank")
        return stripped