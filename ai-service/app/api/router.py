"""Router gốc gom toàn bộ endpoints dưới version prefix ``/v1``."""

from fastapi import APIRouter

from app.api.routes.analyze_document import router as analyze_document_router
from app.api.routes.answer_question import router as answer_question_router
from app.api.routes.generate_quiz import router as generate_quiz_router
from app.api.routes.health import router as health_router
from app.api.routes.index_document import router as index_document_router
from app.api.routes.process_document import router as process_document_router

# Version của HTTP contract độc lập với version package/deployment của ứng dụng.
api_router = APIRouter(prefix="/v1")
api_router.include_router(health_router)
api_router.include_router(analyze_document_router)
api_router.include_router(answer_question_router)
api_router.include_router(generate_quiz_router)
api_router.include_router(process_document_router)
api_router.include_router(index_document_router)