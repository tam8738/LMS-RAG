from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    data: T
    message: str | None = None


class HealthData(BaseModel):
    status: Literal["UP"] = "UP"
    service: str
    environment: str


class PgVectorHealthData(BaseModel):
    status: Literal["UP"] = "UP"
    database: str
    pgvector_extension: str