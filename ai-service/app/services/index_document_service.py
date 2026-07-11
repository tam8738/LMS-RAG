"""Index RAG cho document đã được Backend/Admin cho phép publish."""

from app.schemas.index_document import IndexDocumentRequest, IndexDocumentResult
from app.schemas.process_document import ProcessDocumentRequest
from app.services.process_document_service import ProcessDocumentService


class IndexDocumentService:
    """Use case index: chạy pipeline đầy đủ và trả trạng thái RAG READY."""

    def __init__(self, process_document_service: ProcessDocumentService) -> None:
        """Tái sử dụng pipeline legacy để không nhân đôi logic parse/embed/store."""
        self.process_document_service = process_document_service

    def index(self, request: IndexDocumentRequest) -> IndexDocumentResult:
        """Chunk/embed/store chunks, nhưng không tự cập nhật bảng documents.

        Backend là owner của trạng thái document. AI chỉ ghi `document_chunks`
        qua repository và trả kết quả để Backend chuyển `rag_status` sang READY.
        """
        process_result = self.process_document_service.process(
            ProcessDocumentRequest(
                document_id=request.document_id,
                storage_key=request.storage_key,
                file_type=request.file_type,
                reprocess=request.reindex,
                metadata=request.metadata,
            )
        )
        return IndexDocumentResult(
            document_id=process_result.document_id,
            page_count=process_result.page_count,
            chunk_count=process_result.chunk_count,
        )