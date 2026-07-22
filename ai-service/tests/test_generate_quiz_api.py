"""Tests for /v1/generate-quiz and the quiz generation service."""

import json
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.dependencies import get_generate_quiz_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ServiceError
from app.generation.base import GeneratedQuiz
from app.generation.openai_provider import OpenAIGenerationProvider
from app.main import create_app
from app.schemas.document import RetrievedDocumentChunk
from app.schemas.generate_quiz import GenerateQuizRequest, GenerateQuizResult
from app.services.generate_quiz_service import GenerateQuizService


def chunk(
    *,
    chunk_id: int = 120,
    document_id: int = 12,
    page_number: int | None = 5,
    chunk_index: int = 7,
    content: str = "Chuan hoa co so du lieu giup giam du thua va tranh bat nhat.",
) -> RetrievedDocumentChunk:
    return RetrievedDocumentChunk(
        chunk_id=chunk_id,
        document_id=document_id,
        page_number=page_number,
        chunk_index=chunk_index,
        content=content,
        token_count=18,
        distance=0.0,
        score=1.0,
    )


def quiz_result(tokens_used: int = 42) -> GenerateQuizResult:
    return GenerateQuizResult(
        title="Cau hoi on tap",
        description="Bo cau hoi duoc sinh tu tai lieu da chon.",
        tokens_used=tokens_used,
        questions=[
            {
                "question": "Muc tieu cua chuan hoa co so du lieu la gi?",
                "options": [
                    {"id": "A", "text": "Tang trung lap du lieu"},
                    {"id": "B", "text": "Giam du thua va bat nhat du lieu"},
                    {"id": "C", "text": "Thay the khoa chinh"},
                    {"id": "D", "text": "Chi dung cho NoSQL"},
                ],
                "correct_option_ids": ["B"],
                "explanation": "Tai lieu neu chuan hoa giup giam du thua va tranh bat nhat.",
                "citations": [
                    {
                        "chunk_id": 120,
                        "document_id": 12,
                        "page_number": 5,
                        "chunk_index": 7,
                        "excerpt": "Chuan hoa co so du lieu giup giam du thua va tranh bat nhat.",
                    }
                ],
            }
        ],
    )


class FakeQuizProvider:
    model_name = "mock-generation"

    def __init__(self, result: GenerateQuizResult | None = None) -> None:
        self.result = result or quiz_result()
        self.calls: list[dict[str, object]] = []

    def generate_quiz(self, **kwargs) -> GeneratedQuiz:
        self.calls.append(kwargs)
        return GeneratedQuiz(quiz=self.result)


class GenerateQuizServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = MagicMock()
        self.provider = FakeQuizProvider()
        self.service = GenerateQuizService(
            chunk_repository=self.repository,
            generation_provider=self.provider,
        )

    def test_retrieves_document_chunks_and_returns_provider_quiz(self) -> None:
        self.repository.get_document_chunks.return_value = [chunk()]
        request = GenerateQuizRequest(document_ids=[12, 12], question_count=1)

        result = self.service.generate(request)

        self.assertEqual(result.title, "Cau hoi on tap")
        self.repository.get_document_chunks.assert_called_once_with([12], 12)
        self.assertEqual(self.provider.calls[0]["document_ids"], [12])
        self.assertEqual(self.provider.calls[0]["question_count"], 1)
        self.assertEqual(self.provider.calls[0]["language"], "vi")
        self.assertEqual(self.provider.calls[0]["chunks"], [chunk()])

    def test_raises_no_chunks_found_when_document_has_no_indexed_chunks(self) -> None:
        self.repository.get_document_chunks.return_value = []

        with self.assertRaises(ServiceError) as context:
            self.service.generate(GenerateQuizRequest(document_ids=[12], question_count=1))

        self.assertEqual(context.exception.code, ErrorCode.NO_CHUNKS_FOUND)
        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(self.provider.calls, [])


class GenerateQuizEndpointTest(unittest.TestCase):
    def setUp(self) -> None:
        self.service = MagicMock()
        self.service.generate.return_value = quiz_result()
        self.app = create_app()
        self.app.dependency_overrides[get_generate_quiz_service] = lambda: self.service
        self.app.dependency_overrides[get_expected_internal_api_key] = lambda: "test-secret"
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def test_generate_quiz_endpoint_returns_success_envelope(self) -> None:
        response = self.client.post(
            "/v1/generate-quiz",
            headers={"X-Internal-Key": "test-secret"},
            json={"document_ids": [12], "question_count": 1, "language": "vi"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["title"], "Cau hoi on tap")
        self.assertEqual(body["data"]["questions"][0]["correct_option_ids"], ["B"])
        self.assertEqual(body["message"], "Sinh quiz draft thanh cong")
        request = self.service.generate.call_args.args[0]
        self.assertEqual(request.document_ids, [12])
        self.assertEqual(request.question_count, 1)

    def test_generate_quiz_endpoint_requires_internal_key(self) -> None:
        response = self.client.post(
            "/v1/generate-quiz",
            json={"document_ids": [12], "question_count": 1},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "UNAUTHORIZED_INTERNAL_CALL")
        self.service.generate.assert_not_called()

    def test_generate_quiz_endpoint_rejects_invalid_payload(self) -> None:
        response = self.client.post(
            "/v1/generate-quiz",
            headers={"X-Internal-Key": "test-secret"},
            json={"document_ids": [], "question_count": 99},
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "INVALID_INPUT")
        self.service.generate.assert_not_called()


class OpenAIQuizGenerationProviderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = MagicMock()

    def _provider(self) -> OpenAIGenerationProvider:
        return OpenAIGenerationProvider(
            client=self.client,
            model_name="gpt-4o-mini",
            max_retries=0,
            retry_base_delay_seconds=0,
            request_timeout_seconds=5,
            quiz_max_tokens=900,
        )

    def test_generates_quiz_json_and_maps_citations_from_context_chunks(self) -> None:
        payload = {
            "title": "Cau hoi on tap",
            "description": "Bo cau hoi ngan.",
            "questions": [
                {
                    "question": "Chuan hoa giup dieu gi?",
                    "options": [
                        {"id": "A", "text": "Tang loi"},
                        {"id": "B", "text": "Giam du thua"},
                        {"id": "C", "text": "Xoa bang"},
                        {"id": "D", "text": "Bo khoa"},
                    ],
                    "correct_option_ids": ["B"],
                    "explanation": "Context noi rang chuan hoa giup giam du thua.",
                    "source_chunk_ids": [120],
                }
            ],
        }
        self.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
            usage=SimpleNamespace(total_tokens=88),
        )
        provider = self._provider()

        result = provider.generate_quiz(
            document_ids=[12],
            question_count=1,
            language="vi",
            chunks=[chunk()],
        )

        quiz = result.quiz
        self.assertEqual(quiz.tokens_used, 88)
        self.assertEqual(quiz.questions[0].citations[0].chunk_id, 120)
        self.assertEqual(quiz.questions[0].citations[0].page_number, 5)
        call = self.client.chat.completions.create.call_args.kwargs
        self.assertEqual(call["response_format"], {"type": "json_object"})
        self.assertEqual(call["max_tokens"], 900)
        self.assertIn("source_chunk_ids", call["messages"][0]["content"])

    def test_rejects_quiz_output_with_unknown_source_chunk(self) -> None:
        payload = {
            "title": "Quiz",
            "description": "Draft",
            "questions": [
                {
                    "question": "Q?",
                    "options": [
                        {"id": "A", "text": "A"},
                        {"id": "B", "text": "B"},
                    ],
                    "correct_option_ids": ["A"],
                    "explanation": "Because A.",
                    "source_chunk_ids": [999],
                }
            ],
        }
        self.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
            usage=SimpleNamespace(total_tokens=10),
        )

        with self.assertRaises(ServiceError) as context:
            self._provider().generate_quiz(
                document_ids=[12],
                question_count=1,
                language="vi",
                chunks=[chunk()],
            )

        self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)


if __name__ == "__main__":
    unittest.main()