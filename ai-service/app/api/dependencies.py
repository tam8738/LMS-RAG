"""Khởi tạo dependency production cho các FastAPI routes."""

from functools import lru_cache

from app.core.errors import ErrorCode, ServiceError
from app.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.repositories.postgres_document_chunk_repository import (
    PostgresDocumentChunkRepository,
)
from app.services.analyze_document_service import AnalyzeDocumentService
from app.services.answer_question_service import AnswerQuestionService
from app.services.chunk_embedding_service import ChunkEmbeddingService
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.process_document_service import ProcessDocumentService
from app.services.storage import StorageResolver



@lru_cache(maxsize=1)
def get_analyze_document_service() -> AnalyzeDocumentService:
    """Assemble the lightweight analyze service without embedding/provider dependencies."""
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
    """Assemble the RAG answer service lazily, same as document processing."""
    try:
        embedding_provider = OpenAIEmbeddingProvider()
    except ValueError as exc:
        raise ServiceError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            "Embedding provider chưa được cấu hình",
            status_code=503,
        ) from exc

    return AnswerQuestionService(
        embedding_provider=embedding_provider,
        chunk_repository=PostgresDocumentChunkRepository(),
    )
