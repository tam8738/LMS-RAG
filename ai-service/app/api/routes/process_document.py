from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_process_document_service
from app.api.internal_auth import require_internal_api_key
from app.schemas.common import SuccessResponse
from app.schemas.process_document import (
    ProcessDocumentRequest,
    ProcessDocumentResult,
)
from app.services.process_document_service import ProcessDocumentService

router = APIRouter(tags=["documents"])


@router.post(
    "/process-document",
    response_model=SuccessResponse[ProcessDocumentResult],
    response_model_exclude_none=True,
)
def process_document(
    request: ProcessDocumentRequest,
    _authorization: Annotated[None, Depends(require_internal_api_key)],
    service: Annotated[
        ProcessDocumentService,
        Depends(get_process_document_service),
    ],
) -> SuccessResponse[ProcessDocumentResult]:
    result = service.process(request)
    return SuccessResponse(
        data=result,
        message="Học liệu đã được xử lý thành công",
    )