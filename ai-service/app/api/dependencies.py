"""Composition root: lắp dependency production cho FastAPI routes.

Service nhận dependency qua constructor để test thay provider/repository bằng
fake. ``lru_cache(maxsize=1)`` tạo singleton lazy: OpenAI client chỉ khởi tạo
khi endpoint cần, nên public health vẫn chạy khi local thiếu API key.
"""

from functools import lru_cache

from app.core.errors import ErrorCode, ServiceError
from app.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.generation.openai_provider import OpenAIGenerationProvider
from app.repositories.postgres_document_chunk_repository import (
    PostgresDocumentChunkRepository,
)
from app.services.analyze_document_service import AnalyzeDocumentService
from app.services.answer_question_service import AnswerQuestionService
from app.services.chunk_embedding_service import ChunkEmbeddingService
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.generate_quiz_service import GenerateQuizService
from app.services.process_document_service import ProcessDocumentService
from app.services.storage import StorageResolver


@lru_cache(maxsize=1)
def get_analyze_document_service() -> AnalyzeDocumentService:
    """Lắp ráp service kiểm tra RAG nhẹ, không cần OpenAI/provider."""
    return AnalyzeDocumentService(
        storage_resolver=StorageResolver(),
        document_validator=DocumentValidator(),
        chunking_pipeline=DocumentChunkingPipeline(),
    )


@lru_cache(maxsize=1)
def get_process_document_service() -> ProcessDocumentService:
    """Lắp ráp object graph và tái sử dụng service/OpenAI client giữa requests.

    Khởi tạo lazy khi process endpoint được gọi, không phải khi import app.
    Vì vậy public health vẫn chạy nếu local chưa có OPENAI_API_KEY.
    """
    try:
        embedding_provider = OpenAIEmbeddingProvider()
    except ValueError as exc:
        raise ServiceError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            "Embedding provider chưa được cấu hình",
            status_code=503,
        ) from exc

    return ProcessDocumentService(
        storage_resolver=StorageResolver(),
        document_validator=DocumentValidator(),
        chunking_pipeline=DocumentChunkingPipeline(),
        embedding_service=ChunkEmbeddingService(embedding_provider),
        chunk_repository=PostgresDocumentChunkRepository(),
    )


@lru_cache(maxsize=1)
def get_answer_question_service() -> AnswerQuestionService:
    """Lắp RAG service gồm embedding, generation và PostgreSQL repository.

    AI stateless nên factory không chứa conversation store."""
    try:
        embedding_provider = OpenAIEmbeddingProvider()
        generation_provider = OpenAIGenerationProvider()
    except ValueError as exc:
        raise ServiceError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            "OpenAI provider chua duoc cau hinh",
            status_code=503,
        ) from exc

    return AnswerQuestionService(
        embedding_provider=embedding_provider,
        generation_provider=generation_provider,
        chunk_repository=PostgresDocumentChunkRepository(),
    )


@lru_cache(maxsize=1)
def get_generate_quiz_service() -> GenerateQuizService:
    """Lắp quiz service lazy; Backend là caller nội bộ duy nhất."""
    try:
        generation_provider = OpenAIGenerationProvider()
    except ValueError as exc:
        raise ServiceError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            "OpenAI provider chua duoc cau hinh",
            status_code=503,
        ) from exc

    return GenerateQuizService(
        generation_provider=generation_provider,
        chunk_repository=PostgresDocumentChunkRepository(),
    )