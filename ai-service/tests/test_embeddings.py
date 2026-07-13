"""Kiểm thử embedding batching/retry/output bằng mock, không gọi API thật."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
from openai import APIConnectionError, APITimeoutError

from app.core.errors import ErrorCode, ServiceError
from app.embeddings.base import EmbeddingProvider
from app.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.schemas.document import (
    ChunkedDocument,
    DocumentChunk,
    DocumentFileType,
)
from app.services.chunk_embedding_service import ChunkEmbeddingService


class DeterministicMockEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self,
        dimensions: int = 1536,
        vector_count_offset: int = 0,
        vector_dimension_offset: int = 0,
        include_non_finite_value: bool = False,
    ) -> None:
        super().__init__("mock-embedding", dimensions)
        self.vector_count_offset = vector_count_offset
        self.vector_dimension_offset = vector_dimension_offset
        self.include_non_finite_value = include_non_finite_value
        self.received_texts: list[str] = []

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.received_texts = list(texts)
        count = max(0, len(texts) + self.vector_count_offset)
        vector_size = self.dimensions + self.vector_dimension_offset
        vectors = [
            [float(index + 1)] * vector_size
            for index in range(count)
        ]
        if self.include_non_finite_value and vectors and vectors[0]:
            vectors[0][0] = float("nan")
        return vectors


class FailingMockEmbeddingProvider(EmbeddingProvider):
    def __init__(self) -> None:
        super().__init__("failing-mock", 3)

    def embed(self, _texts: list[str]) -> list[list[float]]:
        raise ServiceError(
            ErrorCode.PROVIDER_UNAVAILABLE,
            "Mock provider unavailable",
            status_code=503,
        )


def embedding_response(vectors: list[list[float]], reverse: bool = False):
    items = [
        SimpleNamespace(index=index, embedding=vector)
        for index, vector in enumerate(vectors)
    ]
    if reverse:
        items.reverse()
    return SimpleNamespace(data=items)


class EmbeddingProviderInterfaceTest(unittest.TestCase):
    def test_rejects_empty_model_name(self) -> None:
        class EmptyModelProvider(EmbeddingProvider):
            def __init__(self) -> None:
                super().__init__("", 3)

            def embed(self, texts: list[str]) -> list[list[float]]:
                return []

        with self.assertRaises(ValueError):
            EmptyModelProvider()

    def test_rejects_non_positive_dimensions(self) -> None:
        with self.assertRaises(ValueError):
            DeterministicMockEmbeddingProvider(dimensions=0)


class OpenAIEmbeddingProviderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = MagicMock()

    def _provider(self, **overrides) -> OpenAIEmbeddingProvider:
        parameters = {
            "client": self.client,
            "model_name": "text-embedding-3-small",
            "dimensions": 3,
            "batch_size": 2,
            "max_retries": 1,
            "retry_base_delay_seconds": 0.25,
            "request_timeout_seconds": 5.0,
            "sleep": MagicMock(),
        }
        parameters.update(overrides)
        return OpenAIEmbeddingProvider(**parameters)

    def test_empty_input_returns_without_calling_openai(self) -> None:
        provider = self._provider()

        result = provider.embed([])

        self.assertEqual(result, [])
        self.client.embeddings.create.assert_not_called()

    def test_rejects_blank_embedding_input(self) -> None:
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.embed(["Nội dung", "  "])

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.client.embeddings.create.assert_not_called()

    def test_batches_requests_and_restores_response_order(self) -> None:
        self.client.embeddings.create.side_effect = [
            embedding_response(
                [[1.0, 1.0, 1.0], [2.0, 2.0, 2.0]],
                reverse=True,
            ),
            embedding_response(
                [[3.0, 3.0, 3.0], [4.0, 4.0, 4.0]],
                reverse=True,
            ),
            embedding_response([[5.0, 5.0, 5.0]]),
        ]
        provider = self._provider()

        result = provider.embed(["a", "b", "c", "d", "e"])

        self.assertEqual(
            result,
            [
                [1.0, 1.0, 1.0],
                [2.0, 2.0, 2.0],
                [3.0, 3.0, 3.0],
                [4.0, 4.0, 4.0],
                [5.0, 5.0, 5.0],
            ],
        )
        self.assertEqual(self.client.embeddings.create.call_count, 3)
        calls = self.client.embeddings.create.call_args_list
        self.assertEqual(calls[0].kwargs["input"], ["a", "b"])
        self.assertEqual(calls[1].kwargs["input"], ["c", "d"])
        self.assertEqual(calls[2].kwargs["input"], ["e"])
        self.assertEqual(calls[0].kwargs["model"], "text-embedding-3-small")
        self.assertEqual(calls[0].kwargs["dimensions"], 3)
        self.assertEqual(calls[0].kwargs["encoding_format"], "float")
        self.assertEqual(calls[0].kwargs["timeout"], 5.0)

    def test_retries_timeout_then_succeeds_with_backoff(self) -> None:
        timeout = APITimeoutError(request=httpx.Request("POST", "https://api.test"))
        self.client.embeddings.create.side_effect = [
            timeout,
            embedding_response([[1.0, 2.0, 3.0]]),
        ]
        sleep = MagicMock()
        provider = self._provider(sleep=sleep)

        result = provider.embed(["a"])

        self.assertEqual(result, [[1.0, 2.0, 3.0]])
        self.assertEqual(self.client.embeddings.create.call_count, 2)
        sleep.assert_called_once_with(0.25)

    def test_retries_multiple_times_with_exponential_backoff(self) -> None:
        timeout = APITimeoutError(request=httpx.Request("POST", "https://api.test"))
        self.client.embeddings.create.side_effect = [
            timeout,
            timeout,
            embedding_response([[1.0, 2.0, 3.0]]),
        ]
        sleep = MagicMock()
        provider = self._provider(
            max_retries=2,
            retry_base_delay_seconds=0.25,
            request_timeout_seconds=7.5,
            sleep=sleep,
        )

        result = provider.embed(["a"])

        self.assertEqual(result, [[1.0, 2.0, 3.0]])
        self.assertEqual(self.client.embeddings.create.call_count, 3)
        self.assertEqual(
            [call.kwargs["timeout"] for call in self.client.embeddings.create.call_args_list],
            [7.5, 7.5, 7.5],
        )
        self.assertEqual(
            [call.args[0] for call in sleep.call_args_list],
            [0.25, 0.5],
        )


    def test_returns_provider_unavailable_after_retry_limit(self) -> None:
        timeout = APITimeoutError(request=httpx.Request("POST", "https://api.test"))
        self.client.embeddings.create.side_effect = [timeout, timeout]
        sleep = MagicMock()
        provider = self._provider(sleep=sleep)

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(
            context.exception.code,
            ErrorCode.PROVIDER_UNAVAILABLE,
        )
        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(self.client.embeddings.create.call_count, 2)
        sleep.assert_called_once_with(0.25)

    def test_connection_error_uses_provider_unavailable_after_retry_limit(self) -> None:
        connection_error = APIConnectionError(
            request=httpx.Request("POST", "https://api.test")
        )
        self.client.embeddings.create.side_effect = [connection_error, connection_error]
        sleep = MagicMock()
        provider = self._provider(sleep=sleep)

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(context.exception.code, ErrorCode.PROVIDER_UNAVAILABLE)
        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(self.client.embeddings.create.call_count, 2)
        sleep.assert_called_once_with(0.25)


    def test_does_not_retry_non_transient_error(self) -> None:
        self.client.embeddings.create.side_effect = ValueError("bad request")
        sleep = MagicMock()
        provider = self._provider(sleep=sleep)

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.assertEqual(self.client.embeddings.create.call_count, 1)
        sleep.assert_not_called()

    def test_rejects_missing_or_duplicate_response_indexes(self) -> None:
        self.client.embeddings.create.return_value = SimpleNamespace(
            data=[
                SimpleNamespace(index=0, embedding=[1.0, 1.0, 1.0]),
                SimpleNamespace(index=0, embedding=[2.0, 2.0, 2.0]),
            ]
        )
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a", "b"])

        self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)

    def test_rejects_vector_with_wrong_dimensions(self) -> None:
        self.client.embeddings.create.return_value = embedding_response(
            [[1.0, 2.0]]
        )
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)
        self.assertEqual(
            context.exception.details[0].field,
            "embedding_dimensions",
        )
    def test_rejects_vector_with_non_finite_value(self) -> None:
        self.client.embeddings.create.return_value = embedding_response(
            [[1.0, float("nan"), 3.0]]
        )
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)
        self.assertEqual(context.exception.details[0].field, "embedding")

    def test_rejects_malformed_response(self) -> None:
        self.client.embeddings.create.return_value = SimpleNamespace()
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.embed(["a"])

        self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)

    def test_rejects_invalid_provider_configuration(self) -> None:
        invalid_options = (
            {"batch_size": 0},
            {"max_retries": -1},
            {"retry_base_delay_seconds": -0.1},
            {"request_timeout_seconds": 0},
        )

        for options in invalid_options:
            with self.subTest(options=options):
                with self.assertRaises(ValueError):
                    self._provider(**options)

    @patch("app.embeddings.openai_provider.OpenAI")
    def test_creates_openai_client_with_sdk_retries_disabled(self, openai_mock) -> None:
        client = MagicMock()
        openai_mock.return_value = client

        provider = OpenAIEmbeddingProvider(
            api_key="test-key",
            model_name="text-embedding-3-small",
            dimensions=3,
            batch_size=2,
            max_retries=0,
            retry_base_delay_seconds=0,
            request_timeout_seconds=5,
        )

        self.assertIs(provider.client, client)
        openai_mock.assert_called_once_with(api_key="test-key", max_retries=0)


    @patch(
        "app.embeddings.openai_provider.settings",
        SimpleNamespace(openai_api_key=""),
    )
    def test_requires_api_key_when_client_is_not_injected(self) -> None:
        with self.assertRaises(ValueError):
            OpenAIEmbeddingProvider(
                api_key="",
                model_name="text-embedding-3-small",
                dimensions=3,
                batch_size=2,
                max_retries=0,
                retry_base_delay_seconds=0,
                request_timeout_seconds=5,
            )


class ChunkEmbeddingServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.document = ChunkedDocument(
            file_type=DocumentFileType.PDF,
            page_count=2,
            chunks=[
                DocumentChunk(
                    page_number=1,
                    chunk_index=0,
                    content="Chunk thứ nhất",
                    token_count=4,
                ),
                DocumentChunk(
                    page_number=2,
                    chunk_index=1,
                    content="Chunk thứ hai",
                    token_count=4,
                ),
            ],
        )

    def test_mock_provider_embeds_chunks_and_preserves_metadata(self) -> None:
        provider = DeterministicMockEmbeddingProvider(dimensions=1536)
        service = ChunkEmbeddingService(provider)

        result = service.embed(self.document)

        self.assertEqual(
            provider.received_texts,
            ["Chunk thứ nhất", "Chunk thứ hai"],
        )
        self.assertEqual(result.embedding_model, "mock-embedding")
        self.assertEqual(result.embedding_dimensions, 1536)
        self.assertEqual(result.chunk_count, 2)
        self.assertEqual(result.chunks[0].page_number, 1)
        self.assertEqual(result.chunks[1].chunk_index, 1)
        self.assertEqual(len(result.chunks[0].embedding), 1536)
        self.assertEqual(result.chunks[0].embedding[0], 1.0)
        self.assertEqual(result.chunks[1].embedding[0], 2.0)

    def test_rejects_vector_count_mismatch(self) -> None:
        provider = DeterministicMockEmbeddingProvider(
            dimensions=3,
            vector_count_offset=-1,
        )

        with self.assertRaises(ServiceError) as context:
            ChunkEmbeddingService(provider).embed(self.document)

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.assertEqual(context.exception.details[0].field, "embedding_count")

    def test_rejects_vector_dimension_mismatch(self) -> None:
        provider = DeterministicMockEmbeddingProvider(
            dimensions=3,
            vector_dimension_offset=-1,
        )

        with self.assertRaises(ServiceError) as context:
            ChunkEmbeddingService(provider).embed(self.document)

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.assertEqual(
            context.exception.details[0].field,
            "embedding_dimensions",
        )
    def test_rejects_non_finite_mock_embedding(self) -> None:
        provider = DeterministicMockEmbeddingProvider(
            dimensions=3,
            include_non_finite_value=True,
        )

        with self.assertRaises(ServiceError) as context:
            ChunkEmbeddingService(provider).embed(self.document)

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.assertEqual(context.exception.details[0].field, "embedding")

    def test_propagates_provider_service_error(self) -> None:
        with self.assertRaises(ServiceError) as context:
            ChunkEmbeddingService(FailingMockEmbeddingProvider()).embed(
                self.document
            )

        self.assertEqual(
            context.exception.code,
            ErrorCode.PROVIDER_UNAVAILABLE,
        )


if __name__ == "__main__":
    unittest.main()
