from app.core.errors import ErrorCode, ServiceError
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.process_document import (
    ProcessDocumentRequest,
    ProcessDocumentResult,
)
from app.services.chunk_embedding_service import ChunkEmbeddingService
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.storage import StorageResolver


class ProcessDocumentService:
    def __init__(
        self,
        storage_resolver: StorageResolver,
        document_validator: DocumentValidator,
        chunking_pipeline: DocumentChunkingPipeline,
        embedding_service: ChunkEmbeddingService,
        chunk_repository: DocumentChunkRepository,
    ) -> None:
        self.storage_resolver = storage_resolver
        self.document_validator = document_validator
        self.chunking_pipeline = chunking_pipeline
        self.embedding_service = embedding_service
        self.chunk_repository = chunk_repository

    def process(
        self,
        request: ProcessDocumentRequest,
    ) -> ProcessDocumentResult:
        path = self.storage_resolver.resolve(request.storage_key)
        validated_document = self.document_validator.validate(
            path,
            request.storage_key,
            request.file_type,
        )
        chunked_document = self.chunking_pipeline.run(validated_document)
        embedded_document = self.embedding_service.embed(chunked_document)
        inserted_count = self.chunk_repository.replace_document_chunks(
            request.document_id,
            request.lecture_id,
            embedded_document,
        )

        if inserted_count != embedded_document.chunk_count:
            raise ServiceError(
                ErrorCode.DATABASE_ERROR,
                "Số chunk đã lưu không khớp kết quả xử lý",
                status_code=503,
            )

        return ProcessDocumentResult(
            document_id=request.document_id,
            lecture_id=request.lecture_id,
            page_count=embedded_document.page_count,
            chunk_count=inserted_count,
        )