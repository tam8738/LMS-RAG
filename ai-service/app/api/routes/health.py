import psycopg
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.db.pgvector_store import ensure_pgvector_ready
from app.schemas.common import HealthResponse, PgVectorHealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        environment=settings.app_env,
    )


@router.get("/health/pgvector", response_model=PgVectorHealthResponse)
def pgvector_health_check() -> PgVectorHealthResponse:
    try:
        result = ensure_pgvector_ready()
    except psycopg.Error as exc:
        raise HTTPException(
            status_code=503,
            detail=f"PostgreSQL/pgvector is not ready: {exc}",
        ) from exc
    return PgVectorHealthResponse(
        status="ok",
        database=result.database,
        pgvector_extension=result.pgvector_extension,
        sample_id=result.sample_id,
        nearest_label=result.nearest_label,
        distance=result.distance,
    )
