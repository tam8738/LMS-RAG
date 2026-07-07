"""Application service điều phối toàn bộ document processing pipeline."""

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
    """Use case trung tâm: resolve -> validate -> chunk -> embed -> persist."""

    def __init__(
        self,
        storage_resolver: StorageResolver,
        document_validator: DocumentValidator,
        chunking_pipeline: DocumentChunkingPipeline,
        embedding_service: ChunkEmbeddingService,
        chunk_repository: DocumentChunkRepository,
    ) -> None:
        """Nhận dependency qua constructor để mỗi bước có thể test độc lập."""
        self.storage_resolver = storage_resolver
        self.document_validator = document_validator
        self.chunking_pipeline = chunking_pipeline
        self.embedding_service = embedding_service
        self.chunk_repository = chunk_repository

    def process(
        self,
        request: ProcessDocumentRequest,
    ) -> ProcessDocumentResult:
        """Thực hiện các bước theo thứ tự; lỗi ở bước nào dừng ngay bước đó.

        Backend quản lý document/job status. AI chỉ xử lý file và ghi chunks,
        sau đó trả số trang/chunk để Backend cập nhật trạng thái PROCESSED.
        """
        # 1. Biến storage key tương đối thành path an toàn trong shared volume.
        path = self.storage_resolver.resolve(request.storage_key)

        # 2. Kiểm tra lại tồn tại, size, extension, signature/encoding.
        validated_document = self.document_validator.validate(
            path,
            request.storage_key,
            request.file_type,
        )

        # 3. Parser được chọn theo file type, sau đó clean và chunk theo token.
        chunked_document = self.chunking_pipeline.run(validated_document)

        # 4. Gọi embedding provider và gắn vector vào đúng chunk metadata.
        embedded_document = self.embedding_service.embed(chunked_document)

        # 5. Lần đầu và reprocess cùng dùng atomic replace transaction.
        inserted_count = self.chunk_repository.replace_document_chunks(
            request.document_id,
            embedded_document,
        )

        # Repository bình thường luôn trả len(rows); kiểm tra này bảo vệ contract
        # nếu sau này có implementation repository khác.
        if inserted_count != embedded_document.chunk_count:
            raise ServiceError(
                ErrorCode.DATABASE_ERROR,
                "Số chunk đã lưu không khớp kết quả xử lý",
                status_code=503,
            )

        return ProcessDocumentResult(
            document_id=request.document_id,
            page_count=embedded_document.page_count,
            chunk_count=inserted_count,
        )
