"""Entry point tạo FastAPI application của AI Service."""

from fastapi import FastAPI

from app.api.error_handlers import register_exception_handlers
from app.api.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    """Application factory giúp test tạo app mới và override dependencies."""
    application = FastAPI(
        title=settings.app_name,
        description="AI service for document processing and RAG workflows.",
        version="0.2.0",
    )
    register_exception_handlers(application)
    application.include_router(api_router)
    return application


# Uvicorn import ``app.main:app`` để lấy instance này.
app = create_app()