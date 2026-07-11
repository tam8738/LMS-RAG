"""Kiểm tra nhẹ khả năng RAG của tài liệu, không embedding và không ghi DB."""

from app.core.errors import ErrorCode, ServiceError
from app.schemas.analyze_document import AnalyzeDocumentRequest, AnalyzeDocumentResult
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.document_validator import DocumentValidator
from app.services.storage import StorageResolver


class AnalyzeDocumentService:
    """Use case analyze: resolve storage_key -> validate -> parse/chunk estimate."""

    def __init__(
        self,
        storage_resolver: StorageResolver,
        document_validator: DocumentValidator,
        chunking_pipeline: DocumentChunkingPipeline,
    ) -> None:
        """Inject dependency để test riêng API mới mà không chạm process-document."""
        self.storage_resolver = storage_resolver
        self.document_validator = document_validator
        self.chunking_pipeline = chunking_pipeline

    def analyze(self, request: AnalyzeDocumentRequest) -> AnalyzeDocumentResult:
        """Trả can_rag cho Backend mà không sinh embedding hoặc lưu chunks.

        EMPTY_DOCUMENT được xem là tài liệu hợp lệ nhưng không hỗ trợ RAG,
        ví dụ PDF scan không có text layer hoặc TXT không còn text sau cleaning.
        Các lỗi khác như file không tồn tại, sai type, quá dung lượng vẫn raise
        theo error envelope chung để Backend biết đây là lỗi xử lý thật.
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
                    can_rag=False,
                    rag_status="UNSUPPORTED",
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
            can_rag=True,
            rag_status="READY_TO_PROCESS",
            page_count=chunked_document.page_count,
            estimated_token_count=estimated_token_count,
            estimated_chunk_count=chunked_document.chunk_count,
            unsupported_reason=None,
        )