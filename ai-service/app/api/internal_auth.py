import secrets
from typing import Annotated

from fastapi import Depends, Header

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError


def get_expected_internal_api_key() -> str:
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
    if (
        not expected_key
        or not x_internal_key
        or not secrets.compare_digest(x_internal_key, expected_key)
    ):
        raise ServiceError(
            ErrorCode.UNAUTHORIZED_INTERNAL_CALL,
            "Internal API key không hợp lệ",
            status_code=401,
        )