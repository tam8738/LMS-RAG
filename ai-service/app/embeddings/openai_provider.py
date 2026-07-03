"""OpenAI implementation của EmbeddingProvider.

Provider chịu trách nhiệm chia batch, retry lỗi tạm thời, giữ thứ tự output
và từ chối response sai trước khi vector đi vào tầng persistence.
"""

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

# Chỉ lỗi có khả năng tự hết mới được retry. Bad request không được retry vì
# gửi lại cùng payload sẽ tiếp tục thất bại và chỉ làm tăng độ trễ/chi phí.
_RETRYABLE_EXCEPTIONS = (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    RateLimitError,
)


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """Sinh embedding qua OpenAI với batch và retry có giới hạn."""

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
        """Khởi tạo provider từ settings hoặc dependency được inject trong test.

        OpenAI client thật được đặt ``max_retries=0`` vì lớp này tự quản lý
        retry. Nếu cả SDK và lớp ngoài cùng retry, số lần gọi và thời gian chờ
        sẽ khó dự đoán.
        """
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
            # Unit test truyền MagicMock vào đây nên không gọi mạng/API thật.
            self.client = client
        else:
            selected_api_key = api_key or settings.openai_api_key
            if not selected_api_key:
                raise ValueError("OPENAI_API_KEY chưa được cấu hình")
            self.client = OpenAI(api_key=selected_api_key, max_retries=0)

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Sinh vector theo batch và ghép kết quả theo đúng thứ tự input."""
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
        """Gọi một batch và retry lỗi tạm thời bằng exponential backoff."""
        # max_retries=2 nghĩa là một lần gọi đầu + tối đa hai lần thử lại.
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

                # 0.5, 1.0, 2.0... giúp tránh gọi dồn khi provider đang quá tải.
                delay = self.retry_base_delay_seconds * (2**retry_number)
                self._sleep(delay)
            except Exception as exc:
                # Lỗi không tạm thời không được retry.
                raise ServiceError(
                    ErrorCode.EMBEDDING_ERROR,
                    "Không thể sinh embedding từ OpenAI",
                    status_code=502,
                ) from exc

        # Về logic, vòng lặp luôn return hoặc raise. Dòng này hỗ trợ type checker.
        raise AssertionError("Vòng lặp retry phải luôn return hoặc raise")

    def _parse_batch_response(
        self,
        response: Any,
        expected_count: int,
    ) -> list[list[float]]:
        """Chuẩn hóa và validate output trước khi trả vector cho nghiệp vụ."""
        try:
            # API có trường index; sort đảm bảo vector thứ i vẫn thuộc text thứ i.
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
            # Cột database là VECTOR(1536), vì vậy sai một chiều cũng không lưu.
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

            # NaN/Infinity làm phép tính khoảng cách không đáng tin cậy và có
            # thể bị pgvector từ chối.
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
        """Fail fast với cấu hình batch/retry/timeout không hợp lệ."""
        if self.batch_size <= 0:
            raise ValueError("embedding batch_size phải lớn hơn 0")
        if self.max_retries < 0:
            raise ValueError("embedding max_retries không được âm")
        if self.retry_base_delay_seconds < 0:
            raise ValueError("embedding retry delay không được âm")
        if self.request_timeout_seconds <= 0:
            raise ValueError("embedding request timeout phải lớn hơn 0")