"""Interface tách nghiệp vụ generation khỏi OpenAI SDK.

Service chỉ biết ``GenerationProvider``; implementation có thể là OpenAI hoặc
fake provider trong test. Dataclass kết quả giữ dữ liệu đã validate, không để
response object của SDK rò rỉ sang tầng application.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk
from app.schemas.generate_quiz import GenerateQuizResult


@dataclass(frozen=True)
class GeneratedAnswer:
    """Câu trả lời đã làm sạch cùng token usage để Backend lưu thống kê."""

    answer: str
    tokens_used: int


@dataclass(frozen=True)
class GeneratedQuiz:
    """Quiz draft đã qua Pydantic validation và citation mapping."""

    quiz: GenerateQuizResult


class GenerationProvider(ABC):
    """Sinh output grounded chỉ từ danh sách chunks caller cung cấp."""

    def __init__(self, model_name: str) -> None:
        if not model_name.strip():
            raise ValueError("generation model_name must not be blank")
        self.model_name = model_name

    @abstractmethod
    def generate_answer(
        self,
        *,
        question: str,
        language: str,
        history: list[ConversationMessage],
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedAnswer:
        """Sinh answer chỉ từ chunks và history stateless được truyền vào."""

    def generate_quiz(
        self,
        *,
        document_ids: list[int],
        question_count: int,
        language: str,
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedQuiz:
        """Sinh quiz JSON có cấu trúc chỉ từ chunks đã chọn."""
        raise NotImplementedError