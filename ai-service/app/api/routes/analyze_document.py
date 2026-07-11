"""HTTP adapter cho analyze nhẹ tài liệu."""

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
    """Analyze file đã upload và trả trạng thái RAG sơ bộ cho Backend."""
    result = service.analyze(request)
    return SuccessResponse(
        data=result,
        message="Tài liệu đã được phân tích thành công",
    )