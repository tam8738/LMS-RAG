"""Analyze nhẹ tài liệu sau upload, chưa embedding và chưa ghi database."""

from app.core.errors import ErrorCode, ServiceError
from app.schemas.analyze_document import AnalyzeDocumentRequest, AnalyzeDocumentResult
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.storage import StorageResolver


class AnalyzeDocumentService:
    """Use case analyze: resolve -> validate -> parse/clean/chunk estimate."""

    def __init__(
        self,
        storage_resolver: StorageResolver,
        document_validator: DocumentValidator,
        chunking_pipeline: DocumentChunkingPipeline,
    ) -> None:
        self.storage_resolver = storage_resolver
        self.document_validator = document_validator
        self.chunking_pipeline = chunking_pipeline

    def analyze(self, request: AnalyzeDocumentRequest) -> AnalyzeDocumentResult:
        """Trả khả năng RAG của tài liệu mà không tạo embedding/chunks trong DB.

        Nếu file hợp lệ nhưng không trích được nội dung text, tài liệu vẫn có thể được
        publish như tài liệu thường. Vì vậy EMPTY_DOCUMENT được map sang UNSUPPORTED.
        """
        path = self.storage_resolver.resolve(request.storage_key)
        validated_document = self.document_validator.validate(
            path,
            request.storage_key,
            request.file_type,
        )

        try:
            chunked_document = self.chunking_pipeline.run(validated_document)
        except ServiceError as exc:
            if exc.code is ErrorCode.EMPTY_DOCUMENT:
                return AnalyzeDocumentResult(
                    document_id=request.document_id,
                    rag_status="UNSUPPORTED",
                    rag_supported=False,
                    page_count=0,
                    estimated_token_count=0,
                    estimated_chunk_count=0,
                    unsupported_reason="EMPTY_DOCUMENT",
                )
            raise

        estimated_token_count = sum(
            chunk.token_count for chunk in chunked_document.chunks
        )

        return AnalyzeDocumentResult(
            document_id=request.document_id,
            rag_status="READY_TO_INDEX",
            rag_supported=True,
            page_count=chunked_document.page_count,
            estimated_token_count=estimated_token_count,
            estimated_chunk_count=chunked_document.chunk_count,
            unsupported_reason=None,
        )