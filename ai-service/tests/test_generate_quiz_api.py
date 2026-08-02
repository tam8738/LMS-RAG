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
        self.repository.get_document_chunks.assert_called_once_with([12], request.max_context_chunks)
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
        self.assertIn("major learning objectives", call["messages"][0]["content"])
        self.assertIn("Coverage rules", call["messages"][1]["content"])

    def test_accepts_twenty_question_quiz_payload(self) -> None:
        payload = {
            "title": "Quiz",
            "description": "Draft",
            "questions": [
                {
                    "question": f"Q{i}?",
                    "options": [
                        {"id": "A", "text": "A"},
                        {"id": "B", "text": "B"},
                        {"id": "C", "text": "C"},
                        {"id": "D", "text": "D"},
                    ],
                    "correct_option_ids": ["A"],
                    "explanation": "Because A.",
                    "source_chunk_ids": [120],
                }
                for i in range(1, 21)
            ],
        }
        self.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
            usage=SimpleNamespace(total_tokens=1000),
        )

        result = self._provider().generate_quiz(
            document_ids=[12],
            question_count=20,
            language="vi",
            chunks=[chunk(chunk_id=120)],
        )

        self.assertEqual(len(result.quiz.questions), 20)
        self.assertEqual(result.quiz.tokens_used, 2000)
        self.assertEqual(result.quiz.questions[19].citations[0].chunk_id, 120)
        self.assertEqual(self.client.chat.completions.create.call_count, 2)
        for call_args in self.client.chat.completions.create.call_args_list:
            self.assertIn("Question count: 10", call_args.kwargs["messages"][1]["content"])

    def test_accepts_context_index_when_model_does_not_copy_chunk_id(self) -> None:
        payload = {
            "title": "Quiz",
            "description": "Draft",
            "questions": [
                {
                    "question": "Q?",
                    "options": [
                        {"id": "A", "text": "A"},
                        {"id": "B", "text": "B"},
                        {"id": "C", "text": "C"},
                        {"id": "D", "text": "D"},
                    ],
                    "correct_option_ids": ["A"],
                    "explanation": "Because A.",
                    "source_chunk_ids": [1],
                }
            ],
        }
        self.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
            usage=SimpleNamespace(total_tokens=10),
        )

        result = self._provider().generate_quiz(
            document_ids=[12],
            question_count=1,
            language="vi",
            chunks=[chunk(chunk_id=120)],
        )

        self.assertEqual(result.quiz.questions[0].citations[0].chunk_id, 120)

    def test_falls_back_to_first_context_chunk_for_unknown_source_chunk(self) -> None:
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

        result = self._provider().generate_quiz(
            document_ids=[12],
            question_count=1,
            language="vi",
            chunks=[chunk(chunk_id=120)],
        )

        self.assertEqual(result.quiz.questions[0].citations[0].chunk_id, 120)

    def test_repairs_mojibake_quiz_text_and_citation_excerpt(self) -> None:
        payload = {
            "title": "Quiz v\u00e1\u00bb\u0081 An to\u00c3\u00a0n",
            "description": "Ki\u00e1\u00bb\u0083m tra an to\u00c3\u00a0n th\u00c3\u00b4ng tin.",
            "questions": [
                {
                    "question": "An to\u00c3\u00a0n th\u00c3\u00b4ng tin l\u00c3\u00a0 g\u00c3\u00ac?",
                    "options": [
                        {"id": "A", "text": "B\u00e1\u00ba\u00a3o v\u00e1\u00bb\u0087 th\u00c3\u00b4ng tin"},
                        {"id": "B", "text": "Sai"},
                        {"id": "C", "text": "Sai"},
                        {"id": "D", "text": "Sai"},
                    ],
                    "correct_option_ids": ["A"],
                    "explanation": "An to\u00c3\u00a0n th\u00c3\u00b4ng tin l\u00c3\u00a0 b\u00e1\u00ba\u00a3o v\u00e1\u00bb\u0087 th\u00c3\u00b4ng tin.",
                    "source_chunk_ids": [120],
                }
            ],
        }
        self.client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
            usage=SimpleNamespace(total_tokens=99),
        )

        result = self._provider().generate_quiz(
            document_ids=[12],
            question_count=1,
            language="vi",
            chunks=[chunk(content="12 CH\u00c6\u00af\u00c6\u00a0NG 1. T\u00e1\u00bb\u0094NG QUAN")],
        )

        quiz = result.quiz
        self.assertEqual(quiz.title, "Quiz v\u1ec1 An to\u00e0n")
        self.assertEqual(quiz.description, "Ki\u1ec3m tra an to\u00e0n th\u00f4ng tin.")
        self.assertEqual(quiz.questions[0].question, "An to\u00e0n th\u00f4ng tin l\u00e0 g\u00ec?")
        self.assertEqual(quiz.questions[0].options[0].text, "B\u1ea3o v\u1ec7 th\u00f4ng tin")
        self.assertEqual(
            quiz.questions[0].explanation,
            "An to\u00e0n th\u00f4ng tin l\u00e0 b\u1ea3o v\u1ec7 th\u00f4ng tin.",
        )
        self.assertEqual(quiz.questions[0].citations[0].excerpt, "12 CH\u01af\u01a0NG 1. T\u1ed4NG QUAN")


if __name__ == "__main__":
    unittest.main()
