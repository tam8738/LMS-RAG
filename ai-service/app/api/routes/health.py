"""Health endpoints cho process FastAPI và PostgreSQL/pgvector."""

from typing import Annotated

import psycopg
from fastapi import APIRouter, Depends

from app.api.internal_auth import require_internal_api_key
from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError
from app.db.pgvector_store import ensure_pgvector_ready
from app.schemas.common import (
    HealthData,
    PgVectorHealthData,
    SuccessResponse,
)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=SuccessResponse[HealthData],
    response_model_exclude_none=True,
)
def health_check() -> SuccessResponse[HealthData]:
    """Public liveness check, không phụ thuộc database hoặc OpenAI."""
    return SuccessResponse(
        data=HealthData(
            service="ai-service",
            environment=settings.app_env,
        )
    )


@router.get(
    "/health/pgvector",
    response_model=SuccessResponse[PgVectorHealthData],
    response_model_exclude_none=True,
)
def pgvector_health_check(
    _authorization: Annotated[None, Depends(require_internal_api_key)],
) -> SuccessResponse[PgVectorHealthData]:
    """Protected readiness check cho database và extension pgvector."""
    try:
        result = ensure_pgvector_ready()
    except psycopg.Error as exc:
        raise ServiceError(
            ErrorCode.DATABASE_ERROR,
            "PostgreSQL/pgvector chưa sẵn sàng",
            status_code=503,
        ) from exc

    return SuccessResponse(
        data=PgVectorHealthData(
            database=result.database,
            pgvector_extension=result.pgvector_extension,
        )
    )