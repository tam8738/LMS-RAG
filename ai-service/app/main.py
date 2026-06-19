from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        description="AI service for document processing and RAG workflows.",
        version="0.1.0",
    )
    app.include_router(health_router)
    return app


app = create_app()
