"""HTTP adapter cho API kiểm tra tài liệu có thể RAG hay không."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_analyze_document_service
from app.api.internal_auth import require_internal_api_key
from app.schemas.analyze_document import AnalyzeDocumentRequest, AnalyzeDocumentResult
from app.schemas.common import SuccessResponse
from app.services.analyze_document_service import AnalyzeDocumentService

router = APIRouter(tags=["documents"])


@router.post(
    "/analyze-document",
    response_model=SuccessResponse[AnalyzeDocumentResult],
    response_model_exclude_none=True,
)
def analyze_document(
    request: AnalyzeDocumentRequest,
    _authorization: Annotated[None, Depends(require_internal_api_key)],
    service: Annotated[
        AnalyzeDocumentService,
        Depends(get_analyze_document_service),
    ],
) -> SuccessResponse[AnalyzeDocumentResult]:
    """Analyze nhẹ file đã upload để Backend biết có nên chạy RAG không."""
    result = service.analyze(request)
    message = (
        "Tài liệu có thể xử lý RAG"
        if result.can_rag
        else "Tài liệu không hỗ trợ RAG"
    )
    return SuccessResponse(data=result, message=message)