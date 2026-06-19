from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class PgVectorHealthResponse(BaseModel):
    status: str
    database: str
    pgvector_extension: str
    sample_id: int
    nearest_label: str
    distance: float
