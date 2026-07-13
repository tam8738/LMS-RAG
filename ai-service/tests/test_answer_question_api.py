"""Tests for /v1/answer-question and the RAG answer service."""

import unittest
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.dependencies import get_answer_question_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ServiceError
from app.main import create_app
from app.schemas.answer_question import AnswerQuestionRequest
from app.schemas.document import RetrievedDocumentChunk
from app.services.answer_question_service import AnswerQuestionService


class FakeEmbeddingProvider:
    model_name = "mock-embedding"
    dimensions = 3

    def __init__(self, vectors: list[list[float]] | None = None) -> None:
        self.vectors = [[0.1, 0.2, 0.3]] if vectors is None else vectors
        self.calls: list[list[str]] = []

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(texts)
        return self.vectors


def retrieved_chunk(
    *,
    chunk_id: int = 120,
    document_id: int = 12,
    page_number: int | None = 5,
    chunk_index: int = 7,
    content: str = "Chuẩn hóa dữ liệu giúp giảm dư thừa và tránh bất nhất.",
    distance: float = 0.08,
    score: float = 0.92,
) -> RetrievedDocumentChunk:
    return RetrievedDocumentChunk(
        chunk_id=chunk_id,
        document_id=document_id,
        page_number=page_number,
        chunk_index=chunk_index,
        content=content,
        token_count=18,
        distance=distance,
        score=score,
    )


class AnswerQuestionServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.embedding_provider = FakeEmbeddingProvider()
        self.repository = MagicMock()
        self.service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
        )

    def test_embeds_question_retrieves_chunks_and_returns_citations(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        request = AnswerQuestionRequest(
            document_ids=[12, 12],
            question="  Chuẩn hóa dữ liệu là gì?  ",
            top_k=5,
        )

        result = self.service.answer(request)

        self.assertFalse(result.not_found)
        self.assertIn("Dựa trên tài liệu đã chọn", result.answer)
        self.assertIn("Chuẩn hóa dữ liệu", result.answer)
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(len(result.citations), 1)
        self.assertEqual(result.citations[0].chunk_id, 120)
        self.assertEqual(result.citations[0].document_id, 12)
        self.assertEqual(result.citations[0].page_number, 5)
        self.assertEqual(result.citations[0].score, 0.92)
        self.assertEqual(self.embedding_provider.calls, [["Chuẩn hóa dữ liệu là gì?"]])
        self.repository.search_similar_chunks.assert_called_once_with(
            [12],
            [0.1, 0.2, 0.3],
            5,
        )

    def test_returns_not_found_without_generation_when_no_chunks(self) -> None:
        self.repository.search_similar_chunks.return_value = []
        request = AnswerQuestionRequest(
            document_ids=[12],
            question="Không có trong tài liệu?",
            top_k=3,
        )

        result = self.service.answer(request)

        self.assertTrue(result.not_found)
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(
            result.answer,
            "Không tìm thấy thông tin này trong tài liệu đã chọn.",
        )

    def test_filters_chunks_below_similarity_threshold(self) -> None:
        self.repository.search_similar_chunks.return_value = [
            retrieved_chunk(score=0.64, distance=0.36),
        ]
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            similarity_threshold=0.65,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Câu hỏi ngoài ngữ cảnh?",
                top_k=3,
            )
        )

        self.assertTrue(result.not_found)
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(
            result.answer,
            "Không tìm thấy thông tin này trong tài liệu đã chọn.",
        )

    def test_keeps_chunks_at_threshold_and_drops_weaker_hits(self) -> None:
        strong_chunk = retrieved_chunk(
            chunk_id=120,
            content="Nội dung đủ liên quan.",
            score=0.65,
            distance=0.35,
        )
        weak_chunk = retrieved_chunk(
            chunk_id=121,
            content="Nội dung yếu hơn.",
            score=0.64,
            distance=0.36,
        )
        self.repository.search_similar_chunks.return_value = [strong_chunk, weak_chunk]
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            similarity_threshold=0.65,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Nội dung nào liên quan?",
                top_k=5,
            )
        )

        self.assertFalse(result.not_found)
        self.assertIn("Nội dung đủ liên quan", result.answer)
        self.assertNotIn("Nội dung yếu hơn", result.answer)
        self.assertEqual([citation.chunk_id for citation in result.citations], [120])

    def test_returns_english_not_found_without_generation(self) -> None:
        self.repository.search_similar_chunks.return_value = []

        result = self.service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="What is not in the document?",
                top_k=3,
                language="en",
            )
        )

        self.assertTrue(result.not_found)
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(result.citations, [])
        self.assertEqual(
            result.answer,
            "No relevant information was found in the selected document.",
        )

    def test_citation_excerpt_is_normalized_and_truncated(self) -> None:
        long_content = "   " + "word " * 80 + "   "
        self.repository.search_similar_chunks.return_value = [
            retrieved_chunk(content=long_content, score=0.95, distance=0.05),
        ]

        result = self.service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Câu hỏi?",
                top_k=3,
            )
        )

        excerpt = result.citations[0].excerpt
        self.assertLessEqual(len(excerpt), 280)
        self.assertTrue(excerpt.endswith("..."))
        self.assertNotIn("  ", excerpt)

    def test_rejects_invalid_similarity_threshold(self) -> None:
        with self.assertRaises(ValueError):
            AnswerQuestionService(
                embedding_provider=self.embedding_provider,
                chunk_repository=self.repository,
                similarity_threshold=1.1,
            )

    def test_wraps_invalid_embedding_count(self) -> None:
        service = AnswerQuestionService(
            embedding_provider=FakeEmbeddingProvider(vectors=[]),
            chunk_repository=self.repository,
        )

        with self.assertRaises(ServiceError) as context:
            service.answer(
                AnswerQuestionRequest(
                    document_ids=[12],
                    question="Câu hỏi?",
                    top_k=3,
                )
            )

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.repository.search_similar_chunks.assert_not_called()


class AnswerQuestionApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app()
        self.service = MagicMock()
        self.app.dependency_overrides[get_expected_internal_api_key] = (
            lambda: "test-secret"
        )
        self.app.dependency_overrides[get_answer_question_service] = (
            lambda: self.service
        )
        self.client = TestClient(
            self.app,
            raise_server_exceptions=False,
        )

    def tearDown(self) -> None:
        self.client.close()
        self.app.dependency_overrides.clear()

    def test_answer_question_endpoint_returns_success_envelope(self) -> None:
        self.service.answer.return_value = AnswerQuestionService(
            FakeEmbeddingProvider(),
            MagicMock(search_similar_chunks=MagicMock(return_value=[retrieved_chunk()])),
        ).answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Chuẩn hóa dữ liệu là gì?",
                top_k=5,
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "Chuẩn hóa dữ liệu là gì?",
                "top_k": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["message"], "Trả lời thành công")
        self.assertFalse(body["data"]["not_found"])
        self.assertEqual(body["data"]["citations"][0]["chunk_id"], 120)
        request = self.service.answer.call_args.args[0]
        self.assertEqual(request.document_ids, [12])
        self.assertEqual(request.question, "Chuẩn hóa dữ liệu là gì?")

    def test_answer_question_endpoint_returns_not_found_message(self) -> None:
        self.service.answer.return_value = AnswerQuestionService(
            FakeEmbeddingProvider(),
            MagicMock(search_similar_chunks=MagicMock(return_value=[])),
        ).answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Không có trong tài liệu?",
                top_k=3,
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "Không có trong tài liệu?",
                "top_k": 3,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["data"]["not_found"])
        self.assertEqual(body["data"]["citations"], [])
        self.assertEqual(body["message"], "Không tìm thấy ngữ cảnh phù hợp")

    def test_requires_internal_key(self) -> None:
        response = self.client.post(
            "/v1/answer-question",
            json={
                "document_ids": [12],
                "question": "Chuẩn hóa dữ liệu là gì?",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["code"],
            "UNAUTHORIZED_INTERNAL_CALL",
        )
        self.service.answer.assert_not_called()

    def test_rejects_invalid_payload(self) -> None:
        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [],
                "question": "  ",
                "top_k": 99,
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "INVALID_INPUT")
        self.service.answer.assert_not_called()


if __name__ == "__main__":
    unittest.main()
