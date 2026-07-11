"""HTTP adapter cho RAG indexing endpoint."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_index_document_service
from app.api.internal_auth import require_internal_api_key
from app.schemas.common import SuccessResponse
from app.schemas.index_document import IndexDocumentRequest, IndexDocumentResult
from app.services.index_document_service import IndexDocumentService

router = APIRouter(tags=["documents"])


@router.post(
    "/index-document",
    response_model=SuccessResponse[IndexDocumentResult],
    response_model_exclude_none=True,
)
def index_document(
    request: IndexDocumentRequest,
    _authorization: Annotated[None, Depends(require_internal_api_key)],
    service: Annotated[
        IndexDocumentService,
        Depends(get_index_document_service),
    ],
) -> SuccessResponse[IndexDocumentResult]:
    """Lập chỉ mục RAG cho document sau khi Backend đã kiểm quyền/trạng thái."""
    result = service.index(request)
    return SuccessResponse(
        data=result,
        message="Tài liệu đã được lập chỉ mục RAG thành công",
    )