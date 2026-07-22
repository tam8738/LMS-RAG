"""Application service for document-scoped quiz draft generation."""

from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.generation.base import GenerationProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.generate_quiz import GenerateQuizRequest, GenerateQuizResult


class GenerateQuizService:
    """Create teacher-reviewable quiz drafts from already indexed document chunks."""

    def __init__(
        self,
        chunk_repository: DocumentChunkRepository,
        generation_provider: GenerationProvider,
    ) -> None:
        self.chunk_repository = chunk_repository
        self.generation_provider = generation_provider

    def generate(self, request: GenerateQuizRequest) -> GenerateQuizResult:
        """Generate a structured quiz draft from Backend-authorized documents."""
        chunks = self.chunk_repository.get_document_chunks(
            request.document_ids,
            request.max_context_chunks,
        )
        if not chunks:
            raise ServiceError(
                ErrorCode.NO_CHUNKS_FOUND,
                "Khong tim thay chunks de sinh quiz tu tai lieu da chon",
                status_code=404,
                details=[
                    ErrorDetail(
                        field="document_ids",
                        message=",".join(str(document_id) for document_id in request.document_ids),
                    )
                ],
            )

        generated = self.generation_provider.generate_quiz(
            document_ids=request.document_ids,
            question_count=request.question_count,
            language=request.language,
            chunks=chunks,
        )
        return generated.quiz