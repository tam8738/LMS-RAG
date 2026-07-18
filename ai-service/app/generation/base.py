"""Provider interface for grounded answer generation."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk


@dataclass(frozen=True)
class GeneratedAnswer:
    """Text and usage returned by a generation provider."""

    answer: str
    tokens_used: int


class GenerationProvider(ABC):
    """Generate a natural answer from retrieved document context."""

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