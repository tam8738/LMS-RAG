"""Provider interface for grounded answer and quiz generation."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk
from app.schemas.generate_quiz import GenerateQuizResult


@dataclass(frozen=True)
class GeneratedAnswer:
    """Text and usage returned by a generation provider."""

    answer: str
    tokens_used: int


@dataclass(frozen=True)
class GeneratedQuiz:
    """Structured quiz draft returned by a generation provider."""

    quiz: GenerateQuizResult


class GenerationProvider(ABC):
    """Generate grounded text outputs from retrieved document context."""

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
        """Return an answer grounded only in the supplied chunks."""

    def generate_quiz(
        self,
        *,
        document_ids: list[int],
        question_count: int,
        language: str,
        chunks: list[RetrievedDocumentChunk],
    ) -> GeneratedQuiz:
        """Return a structured quiz draft grounded only in supplied chunks."""
        raise NotImplementedError