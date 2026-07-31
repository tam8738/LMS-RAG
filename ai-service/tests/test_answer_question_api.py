"""Tests for /v1/answer-question and the RAG answer service."""

import unittest
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.dependencies import get_answer_question_service
from app.api.internal_auth import get_expected_internal_api_key
from app.core.errors import ErrorCode, ServiceError
from app.generation.base import GeneratedAnswer
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


class FakeGenerationProvider:
    model_name = "mock-generation"

    def __init__(self, answer: str = "Cau tra loi tu nhien tu LLM.") -> None:
        self.answer = answer
        self.calls: list[dict[str, object]] = []

    def generate_answer(self, **kwargs) -> GeneratedAnswer:
        self.calls.append(kwargs)
        return GeneratedAnswer(answer=self.answer, tokens_used=37)


class FailingGenerationProvider:
    model_name = "failing-generation"

    def generate_answer(self, **_kwargs) -> GeneratedAnswer:
        raise ServiceError(ErrorCode.GENERATION_ERROR, "mock generation failed")

def retrieved_chunk(
    *,
    chunk_id: int = 120,
    document_id: int = 12,
    page_number: int | None = 5,
    chunk_index: int = 7,
    content: str = "Chuáº©n hÃ³a dá»¯ liá»‡u giÃºp giáº£m dÆ° thá»«a vÃ  trÃ¡nh báº¥t nháº¥t.",
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
        self.repository.get_chapter_chunks.return_value = []

    def test_embeds_question_retrieves_chunks_and_returns_citations(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        request = AnswerQuestionRequest(
            document_ids=[12, 12],
            question="  Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?  ",
            top_k=5,
        )

        result = self.service.answer(request)

        self.assertFalse(result.not_found)
        self.assertIn("D\u1ef1a tr\u00ean t\u00e0i li\u1ec7u \u0111\u00e3 ch\u1ecdn", result.answer)
        self.assertIn("Chuáº©n hÃ³a dá»¯ liá»‡u", result.answer)
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(len(result.citations), 1)
        self.assertEqual(result.citations[0].chunk_id, 120)
        self.assertEqual(result.citations[0].document_id, 12)
        self.assertEqual(result.citations[0].page_number, 5)
        self.assertEqual(result.citations[0].score, 0.92)
        self.assertEqual(self.embedding_provider.calls, [["Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?"]])
        self.repository.search_similar_chunks.assert_called_once_with(
            [12],
            [0.1, 0.2, 0.3],
            8,
        )

    def test_uses_current_question_for_retrieval_when_history_exists(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        request = AnswerQuestionRequest(
            document_ids=[12],
            question="Any other example?",
            top_k=5,
            history=[
                {"role": "user", "content": "What is normalization?"},
                {"role": "assistant", "content": "It reduces data redundancy."},
            ],
        )

        result = self.service.answer(request)

        self.assertFalse(result.not_found)
        self.assertEqual(self.embedding_provider.calls, [["Any other example?"]])
        self.repository.search_similar_chunks.assert_called_once_with(
            [12],
            [0.1, 0.2, 0.3],
            8,
        )


    def test_summary_question_uses_wider_retrieval_top_k(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        request = AnswerQuestionRequest(
            document_ids=[12],
            question="T\u00f3m t\u1eaft c\u00e1c \u00fd ch\u00ednh c\u1ee7a t\u00e0i li\u1ec7u?",
            top_k=3,
        )

        result = self.service.answer(request)

        self.assertFalse(result.not_found)
        self.repository.search_similar_chunks.assert_called_once_with(
            [12],
            [0.1, 0.2, 0.3],
            8,
        )

    def test_chapter_question_uses_contiguous_chapter_context(self) -> None:
        chapter_chunks = [
            retrieved_chunk(chunk_id=501, page_number=23, chunk_index=28, content="Chapter start"),
            retrieved_chunk(chunk_id=502, page_number=24, chunk_index=29, content="Chapter continuation"),
        ]
        self.repository.get_chapter_chunks.return_value = chapter_chunks
        generation_provider = FakeGenerationProvider(answer="Chapter overview.")
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Ch\u01b0\u01a1ng 3 n\u00f3i v\u1ec1 \u0111i\u1ec1u g\u00ec?",
            )
        )

        self.repository.get_chapter_chunks.assert_called_once_with([12], 3, 64)
        self.repository.search_similar_chunks.assert_not_called()
        self.assertEqual(generation_provider.calls[0]["chunks"], chapter_chunks)
        self.assertEqual([citation.chunk_id for citation in result.citations], [501, 502])
        self.assertEqual(result.answer, "Chapter overview.")

    def test_returns_not_found_without_generation_when_no_chunks(self) -> None:
        self.repository.search_similar_chunks.return_value = []
        request = AnswerQuestionRequest(
            document_ids=[12],
            question="KhÃ´ng cÃ³ trong tÃ i liá»‡u?",
            top_k=3,
        )

        result = self.service.answer(request)

        self.assertTrue(result.not_found)
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(
            result.answer,
            "Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin n\u00e0y trong t\u00e0i li\u1ec7u \u0111\u00e3 ch\u1ecdn.",
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
                question="CÃ¢u há»i ngoÃ i ngá»¯ cáº£nh?",
                top_k=3,
            )
        )

        self.assertTrue(result.not_found)
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 0)
        self.assertEqual(
            result.answer,
            "Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin n\u00e0y trong t\u00e0i li\u1ec7u \u0111\u00e3 ch\u1ecdn.",
        )

    def test_keeps_chunks_at_threshold_and_drops_weaker_hits(self) -> None:
        strong_chunk = retrieved_chunk(
            chunk_id=120,
            content="Ná»™i dung Ä‘á»§ liÃªn quan.",
            score=0.65,
            distance=0.35,
        )
        weak_chunk = retrieved_chunk(
            chunk_id=121,
            content="Ná»™i dung yáº¿u hÆ¡n.",
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
                question="Ná»™i dung nÃ o liÃªn quan?",
                top_k=5,
            )
        )

        self.assertFalse(result.not_found)
        self.assertIn("Ná»™i dung Ä‘á»§ liÃªn quan", result.answer)
        self.assertNotIn("Ná»™i dung yáº¿u hÆ¡n", result.answer)
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
                question="CÃ¢u há»i?",
                top_k=3,
            )
        )

        excerpt = result.citations[0].excerpt
        self.assertLessEqual(len(excerpt), 280)
        self.assertTrue(excerpt.endswith("..."))
        self.assertNotIn("  ", excerpt)

    def test_citation_excerpt_removes_duplicate_page_prefix(self) -> None:
        self.repository.search_similar_chunks.return_value = [
            retrieved_chunk(
                page_number=11,
                content='"11 1.1.2 Lap trinh cau truc Trong lap trinh huong cau truc, chuong trinh chinh duoc chia thanh cac chuong trinh con."',
            ),
        ]

        result = self.service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Lap trinh cau truc la gi?",
                top_k=3,
            )
        )

        excerpt = result.citations[0].excerpt
        self.assertTrue(excerpt.startswith("1.1.2 Lap trinh cau truc"))
        self.assertNotRegex(excerpt, r'^"?11\s')

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
                    question="CÃ¢u há»i?",
                    top_k=3,
                )
            )

        self.assertEqual(context.exception.code, ErrorCode.EMBEDDING_ERROR)
        self.repository.search_similar_chunks.assert_not_called()


    def test_uses_generation_provider_after_retrieval(self) -> None:
        chunk = retrieved_chunk(score=0.91, distance=0.09)
        self.repository.search_similar_chunks.return_value = [chunk]
        generation_provider = FakeGenerationProvider(
            answer="Chuan hoa du lieu la cach to chuc bang de giam du thua."
        )
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
        )
        request = AnswerQuestionRequest(
            document_ids=[12],
            question="Chuan hoa du lieu la gi?",
            history=[
                {"role": "user", "content": "Noi ve database normalization"},
            ],
        )

        result = service.answer(request)

        self.assertFalse(result.not_found)
        self.assertEqual(
            result.answer,
            "Chuan hoa du lieu la cach to chuc bang de giam du thua.",
        )
        self.assertEqual(result.tokens_used, 37)
        self.assertEqual([citation.chunk_id for citation in result.citations], [120])
        self.assertEqual(len(generation_provider.calls), 1)
        call = generation_provider.calls[0]
        self.assertEqual(call["question"], "Chuan hoa du lieu la gi?")
        self.assertEqual(call["language"], "vi")
        self.assertEqual(call["history"], request.history)
        self.assertEqual(call["chunks"], [chunk])

    def test_generation_insufficient_answer_returns_not_found_without_citations(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        generation_provider = FakeGenerationProvider(
            answer="Tai lieu khong chua thong tin ve dinh nghia cay nhi phan."
        )
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Dinh nghia cay nhi phan la gi?",
            )
        )

        self.assertTrue(result.not_found)
        self.assertEqual(
            result.answer,
            "Tai lieu khong chua thong tin ve dinh nghia cay nhi phan.",
        )
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 37)

    def test_generation_insufficient_answer_with_cung_cap_phrase_returns_not_found(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        generation_provider = FakeGenerationProvider(
            answer="T\u00e0i li\u1ec7u kh\u00f4ng ch\u1ee9a \u0111\u1ee7 th\u00f4ng tin v\u1ec1 kh\u00e1i ni\u1ec7m n\u00e0y."
        )
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Khai niem nay la gi?",
            )
        )

        self.assertTrue(result.not_found)
        self.assertEqual(result.citations, [])
        self.assertEqual(result.tokens_used, 37)
    def test_generation_only_receives_chunks_that_pass_threshold(self) -> None:
        strong_chunk = retrieved_chunk(chunk_id=120, score=0.75, distance=0.25)
        weak_chunk = retrieved_chunk(chunk_id=121, score=0.40, distance=0.60)
        self.repository.search_similar_chunks.return_value = [strong_chunk, weak_chunk]
        generation_provider = FakeGenerationProvider(answer="Generated from strong chunk.")
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
            similarity_threshold=0.65,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Noi dung nao lien quan?",
            )
        )

        self.assertEqual(result.answer, "Generated from strong chunk.")
        self.assertEqual(generation_provider.calls[0]["chunks"], [strong_chunk])
        self.assertEqual([citation.chunk_id for citation in result.citations], [120])

    def test_does_not_call_generation_provider_when_no_context_remains(self) -> None:
        self.repository.search_similar_chunks.return_value = [
            retrieved_chunk(score=0.10, distance=0.90),
        ]
        generation_provider = FakeGenerationProvider()
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
            similarity_threshold=0.65,
        )

        result = service.answer(AnswerQuestionRequest(document_ids=[12], question="X?"))

        self.assertTrue(result.not_found)
        self.assertEqual(generation_provider.calls, [])

    def test_follow_up_question_uses_previous_turn_for_retrieval(self) -> None:
        strong_chunk = retrieved_chunk(
            chunk_id=120,
            content="Lap trinh tuyen tinh la mot phuong phap toi uu hoa.",
            score=0.82,
            distance=0.18,
        )
        self.repository.search_similar_chunks.return_value = [strong_chunk]
        generation_provider = FakeGenerationProvider(
            answer="Lap trinh tuyen tinh duoc giai thich chi tiet hon."
        )
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
            similarity_threshold=0.65,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Noi chi tiet hon di",
                history=[
                    {"role": "user", "content": "Lap trinh tuyen tinh la gi?"},
                    {"role": "assistant", "content": "Lap trinh tuyen tinh la mot phuong phap toi uu hoa."},
                ],
            )
        )

        retrieval_query = self.embedding_provider.calls[0][0]
        self.assertFalse(result.not_found)
        self.assertIn("Lap trinh tuyen tinh la gi?", retrieval_query)
        self.assertIn("phuong phap toi uu hoa", retrieval_query)
        self.assertIn("Noi chi tiet hon di", retrieval_query)
        self.assertEqual(generation_provider.calls[0]["question"], "Noi chi tiet hon di")
    def test_current_question_retrieval_avoids_history_pollution(self) -> None:
        strong_chunk = retrieved_chunk(chunk_id=120, score=0.80, distance=0.20)
        self.repository.search_similar_chunks.return_value = [strong_chunk]
        generation_provider = FakeGenerationProvider(answer="First normal form removes repeating groups.")
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=generation_provider,
            similarity_threshold=0.65,
        )

        result = service.answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="What does the first normal form remove?",
                history=[
                    {"role": "user", "content": "Earlier unclear mixed-language question about First Normal Form"},
                    {"role": "assistant", "content": "No relevant information was found."},
                ],
            )
        )

        self.assertFalse(result.not_found)
        self.assertEqual(result.answer, "First normal form removes repeating groups.")
        self.assertEqual([citation.chunk_id for citation in result.citations], [120])
        self.repository.search_similar_chunks.assert_called_once_with(
            [12],
            [0.1, 0.2, 0.3],
            8,
        )
        self.assertEqual(self.embedding_provider.calls, [["What does the first normal form remove?"]])
    def test_propagates_generation_provider_error(self) -> None:
        self.repository.search_similar_chunks.return_value = [retrieved_chunk()]
        service = AnswerQuestionService(
            embedding_provider=self.embedding_provider,
            chunk_repository=self.repository,
            generation_provider=FailingGenerationProvider(),
        )

        with self.assertRaises(ServiceError) as context:
            service.answer(AnswerQuestionRequest(document_ids=[12], question="X?"))

        self.assertEqual(context.exception.code, ErrorCode.GENERATION_ERROR)

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
                question="Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?",
                top_k=5,
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?",
                "top_k": 5,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["message"], "Tr\u1ea3 l\u1eddi th\u00e0nh c\u00f4ng")
        self.assertFalse(body["data"]["not_found"])
        self.assertEqual(body["data"]["citations"][0]["chunk_id"], 120)
        request = self.service.answer.call_args.args[0]
        self.assertEqual(request.document_ids, [12])
        self.assertEqual(request.question, "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?")

    def test_answer_question_endpoint_accepts_stateless_history(self) -> None:
        self.service.answer.return_value = AnswerQuestionService(
            FakeEmbeddingProvider(),
            MagicMock(search_similar_chunks=MagicMock(return_value=[retrieved_chunk()])),
        ).answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="CÃ²n vÃ­ dá»¥ nÃ o khÃ¡c?",
                top_k=5,
                history=[
                    {"role": "user", "content": "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?"},
                    {"role": "assistant", "content": "No relevant information was found."},
                ],
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "CÃ²n vÃ­ dá»¥ nÃ o khÃ¡c?",
                "top_k": 5,
                "history": [
                    {"role": "user", "content": "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?"},
                    {"role": "assistant", "content": "LÃ  cÃ¡ch giáº£m dÆ° thá»«a dá»¯ liá»‡u."},
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        request = self.service.answer.call_args.args[0]
        self.assertEqual(request.history[0].role, "user")
        self.assertEqual(request.history[0].content, "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?")
        self.assertEqual(request.history[1].role, "assistant")


    def test_answer_question_endpoint_truncates_long_history_content(self) -> None:
        self.service.answer.return_value = AnswerQuestionService(
            FakeEmbeddingProvider(),
            MagicMock(search_similar_chunks=MagicMock(return_value=[retrieved_chunk()])),
        ).answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="Noi chi tiet hon di",
                top_k=5,
                history=[
                    {"role": "user", "content": "Tom tat tai lieu nay"},
                    {"role": "assistant", "content": "A" * 2500},
                ],
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "Noi chi tiet hon di",
                "top_k": 5,
                "history": [
                    {"role": "user", "content": "Tom tat tai lieu nay"},
                    {"role": "assistant", "content": "A" * 2500},
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        request = self.service.answer.call_args.args[0]
        self.assertEqual(len(request.history[1].content), 2000)
        self.assertEqual(request.history[1].content, "A" * 2000)


    def test_answer_question_endpoint_returns_not_found_message(self) -> None:
        self.service.answer.return_value = AnswerQuestionService(
            FakeEmbeddingProvider(),
            MagicMock(search_similar_chunks=MagicMock(return_value=[])),
        ).answer(
            AnswerQuestionRequest(
                document_ids=[12],
                question="KhÃ´ng cÃ³ trong tÃ i liá»‡u?",
                top_k=3,
            )
        )

        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "KhÃ´ng cÃ³ trong tÃ i liá»‡u?",
                "top_k": 3,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["data"]["not_found"])
        self.assertEqual(body["data"]["citations"], [])
        self.assertEqual(body["message"], "Kh\u00f4ng t\u00ecm th\u1ea5y ng\u1eef c\u1ea3nh ph\u00f9 h\u1ee3p")

    def test_requires_internal_key(self) -> None:
        response = self.client.post(
            "/v1/answer-question",
            json={
                "document_ids": [12],
                "question": "Chuáº©n hÃ³a dá»¯ liá»‡u lÃ  gÃ¬?",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["code"],
            "UNAUTHORIZED_INTERNAL_CALL",
        )
        self.service.answer.assert_not_called()

    def test_rejects_invalid_history_payload(self) -> None:
        response = self.client.post(
            "/v1/answer-question",
            headers={"X-Internal-Key": "test-secret"},
            json={
                "document_ids": [12],
                "question": "CÃ¢u há»i há»£p lá»‡",
                "history": [
                    {"role": "user", "content": "   "},
                ],
            },
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["error"]["code"], "INVALID_INPUT")
        fields = {detail["field"] for detail in response.json()["error"]["details"]}
        self.assertIn("body.history.0.content", fields)
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
