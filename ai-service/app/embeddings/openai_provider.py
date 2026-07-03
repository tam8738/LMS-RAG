import math
import time
from collections.abc import Callable
from typing import Any

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.embeddings.base import EmbeddingProvider

_RETRYABLE_EXCEPTIONS = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self,
        client: Any | None = None,
        *,
        api_key: str | None = None,
        model_name: str | None = None,
        dimensions: int | None = None,
        batch_size: int | None = None,
        max_retries: int | None = None,
        retry_base_delay_seconds: float | None = None,
        request_timeout_seconds: float | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        super().__init__(
            model_name=model_name or settings.embedding_model,
            dimensions=(
                dimensions
                if dimensions is not None
                else settings.embedding_dimensions
            ),
        )
        self.batch_size = (
            batch_size
            if batch_size is not None
            else settings.embedding_batch_size
        )
        self.max_retries = (
            max_retries
            if max_retries is not None
            else settings.embedding_max_retries
        )
        self.retry_base_delay_seconds = (
            retry_base_delay_seconds
            if retry_base_delay_seconds is not None
            else settings.embedding_retry_base_delay_seconds
        )
        self.request_timeout_seconds = (
            request_timeout_seconds
            if request_timeout_seconds is not None
            else settings.embedding_request_timeout_seconds
        )
        self._validate_configuration()
        self._sleep = sleep

        if client is not None:
            self.client = client
        else:
            selected_api_key = api_key or settings.openai_api_key
            if not selected_api_key:
                raise ValueError("OPENAI_API_KEY chưa được cấu hình")
            self.client = OpenAI(api_key=selected_api_key, max_retries=0)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if any(not text.strip() for text in texts):
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Nội dung dùng để sinh embedding không được rỗng",
                status_code=422,
            )

        embeddings: list[list[float]] = []
        for batch_start in range(0, len(texts), self.batch_size):
            batch = texts[batch_start : batch_start + self.batch_size]
            response = self._request_batch(batch)
            embeddings.extend(self._parse_batch_response(response, len(batch)))

        return embeddings

    def _request_batch(self, batch: list[str]) -> Any:
        for retry_number in range(self.max_retries + 1):
            try:
                return self.client.embeddings.create(
                    input=batch,
                    model=self.model_name,
                    dimensions=self.dimensions,
                    encoding_format="float",
                    timeout=self.request_timeout_seconds,
                )
            except _RETRYABLE_EXCEPTIONS as exc:
                if retry_number >= self.max_retries:
                    raise ServiceError(
                        ErrorCode.PROVIDER_UNAVAILABLE,
                        "OpenAI embedding provider tạm thời không khả dụng",
                        status_code=503,
                    ) from exc

                delay = self.retry_base_delay_seconds * (2**retry_number)
                self._sleep(delay)
            except Exception as exc:
                raise ServiceError(
                    ErrorCode.EMBEDDING_ERROR,
                    "Không thể sinh embedding từ OpenAI",
                    status_code=502,
                ) from exc

        raise AssertionError("Vòng lặp retry phải luôn return hoặc raise")

    def _parse_batch_response(
        self,
        response: Any,
        expected_count: int,
    ) -> list[list[float]]:
        try:
            items = sorted(response.data, key=lambda item: item.index)
            indexes = [item.index for item in items]
            vectors = [
                [float(value) for value in item.embedding]
                for item in items
            ]
        except Exception as exc:
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI trả về embedding không đúng cấu trúc",
                status_code=502,
            ) from exc

        if indexes != list(range(expected_count)):
            raise ServiceError(
                ErrorCode.INVALID_OUTPUT,
                "OpenAI trả về sai thứ tự hoặc thiếu embedding",
                status_code=502,
                details=[
                    ErrorDetail(
                        field="embedding_count",
                        message=f"Cần {expected_count}, nhận {len(vectors)}",
                    )
                ],
            )

        for index, vector in enumerate(vectors):
            if len(vector) != self.dimensions:
                raise ServiceError(
                    ErrorCode.INVALID_OUTPUT,
                    "OpenAI trả về vector sai số chiều",
                    status_code=502,
                    details=[
                        ErrorDetail(
                            field="embedding_dimensions",
                            message=(
                                f"Vector {index}: cần {self.dimensions}, "
                                f"nhận {len(vector)}"
                            ),
                        )
                    ],
                )
            if any(not math.isfinite(value) for value in vector):
                raise ServiceError(
                    ErrorCode.INVALID_OUTPUT,
                    "OpenAI trả về vector chứa giá trị không hữu hạn",
                    status_code=502,
                    details=[
                        ErrorDetail(
                            field="embedding",
                            message=f"Vector {index} chứa NaN hoặc Infinity",
                        )
                    ],
                )

        return vectors

    def _validate_configuration(self) -> None:
        if self.batch_size <= 0:
            raise ValueError("embedding batch_size phải lớn hơn 0")
        if self.max_retries < 0:
            raise ValueError("embedding max_retries không được âm")
        if self.retry_base_delay_seconds < 0:
            raise ValueError("embedding retry delay không được âm")
        if self.request_timeout_seconds <= 0:
            raise ValueError("embedding request timeout phải lớn hơn 0")