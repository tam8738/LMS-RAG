"""HTTP adapter for document-scoped RAG question answering."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_answer_question_service
from app.api.internal_auth import require_internal_api_key
from app.schemas.answer_question import (
    AnswerQuestionRequest,
    AnswerQuestionResult,
)
from app.schemas.common import SuccessResponse
from app.services.answer_question_service import AnswerQuestionService

router = APIRouter(tags=["rag"])


@router.post(
    "/answer-question",
    response_model=SuccessResponse[AnswerQuestionResult],
    response_model_exclude_none=True,
)
def answer_question(
    request: AnswerQuestionRequest,
    _authorization: Annotated[None, Depends(require_internal_api_key)],
    service: Annotated[
        AnswerQuestionService,
        Depends(get_answer_question_service),
    ],
) -> SuccessResponse[AnswerQuestionResult]:
    """Answer a question from Backend-authorized document chunks only."""
    result = service.answer(request)
    message = (
        "Không tìm thấy ngữ cảnh phù hợp"
        if result.not_found
        else "Trả lời thành công"
    )
    return SuccessResponse(data=result, message=message)