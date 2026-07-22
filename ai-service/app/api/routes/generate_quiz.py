"""HTTP adapter for document-scoped quiz draft generation."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_generate_quiz_service
from app.api.internal_auth import require_internal_api_key
from app.schemas.common import SuccessResponse
from app.schemas.generate_quiz import GenerateQuizRequest, GenerateQuizResult
from app.services.generate_quiz_service import GenerateQuizService

router = APIRouter(tags=["quiz"])


@router.post(
    "/generate-quiz",
    response_model=SuccessResponse[GenerateQuizResult],
    response_model_exclude_none=True,
)
def generate_quiz(
    request: GenerateQuizRequest,
    _authorization: Annotated[None, Depends(require_internal_api_key)],
    service: Annotated[
        GenerateQuizService,
        Depends(get_generate_quiz_service),
    ],
) -> SuccessResponse[GenerateQuizResult]:
    """Generate a grounded quiz draft for Backend to persist after teacher review."""
    result = service.generate(request)
    return SuccessResponse(data=result, message="Sinh quiz draft thanh cong")