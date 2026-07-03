"""FastAPI dependency xác thực request nội bộ từ Backend."""

import secrets
from typing import Annotated

from fastapi import Depends, Header

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError


def get_expected_internal_api_key() -> str:
    """Trả secret server; tách hàm để unit test override dependency dễ dàng."""
    return settings.internal_api_key


def require_internal_api_key(
    expected_key: Annotated[
        str,
        Depends(get_expected_internal_api_key),
    ],
    x_internal_key: Annotated[
        str | None,
        Header(alias="X-Internal-Key"),
    ] = None,
) -> None:
    """Cho phép request chỉ khi header khớp secret đã cấu hình.

    Cơ chế fail-closed: server key rỗng, header thiếu hoặc header sai đều bị
    từ chối. AI không kiểm tra JWT; Backend đã xác thực user trước khi gọi.
    """
    if (
        not expected_key
        or not x_internal_key
        # compare_digest phù hợp hơn so sánh == cho dữ liệu secret.
        or not secrets.compare_digest(x_internal_key, expected_key)
    ):
        raise ServiceError(
            ErrorCode.UNAUTHORIZED_INTERNAL_CALL,
            "Internal API key không hợp lệ",
            status_code=401,
        )