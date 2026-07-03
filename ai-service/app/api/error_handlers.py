import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.errors import (
    ErrorBody,
    ErrorCode,
    ErrorDetail,
    ErrorResponse,
    ServiceError,
)

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ServiceError, service_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)


async def service_error_handler(
    _request: Request,
    exception: ServiceError,
) -> JSONResponse:
    response = ErrorResponse(
        error=ErrorBody(
            code=exception.code,
            message=exception.message,
            details=exception.details,
        )
    )
    return JSONResponse(
        status_code=exception.status_code,
        content=response.model_dump(mode="json"),
    )


async def validation_error_handler(
    _request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    details = [
        ErrorDetail(
            field=".".join(str(part) for part in error["loc"]),
            message=error["msg"],
        )
        for error in exception.errors()
    ]
    response = ErrorResponse(
        error=ErrorBody(
            code=ErrorCode.INVALID_INPUT,
            message="Dữ liệu request không hợp lệ",
            details=details,
        )
    )
    return JSONResponse(
        status_code=422,
        content=response.model_dump(mode="json"),
    )


async def unexpected_error_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    logger.exception(
        "Unhandled AI Service error for %s %s",
        request.method,
        request.url.path,
        exc_info=exception,
    )
    response = ErrorResponse(
        error=ErrorBody(
            code=ErrorCode.INTERNAL_ERROR,
            message="AI Service gặp lỗi nội bộ",
        )
    )
    return JSONResponse(
        status_code=500,
        content=response.model_dump(mode="json"),
    )