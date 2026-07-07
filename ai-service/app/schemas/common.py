"""Các schema response dùng chung cho nhiều endpoint."""

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

# T cho phép ``data`` có kiểu cụ thể và được mô tả chính xác trong Swagger.
T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Success envelope chung: ``success + data + message``."""

    success: Literal[True] = True
    data: T
    message: str | None = None


class HealthData(BaseModel):
    """Thông tin chứng minh process FastAPI đang hoạt động."""

    status: Literal["UP"] = "UP"
    service: str
    environment: str


class PgVectorHealthData(BaseModel):
    """Thông tin chứng minh PostgreSQL và extension pgvector sẵn sàng."""

    status: Literal["UP"] = "UP"
    database: str
    pgvector_extension: str