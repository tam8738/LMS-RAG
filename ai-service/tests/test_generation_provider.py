"""Tests for the OpenAI grounded generation provider."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
from openai import APITimeoutError

from app.core.errors import ErrorCode, ServiceError
from app.generation.base import GenerationProvider
from app.generation.openai_provider import OpenAIGenerationProvider
from app.schemas.answer_question import ConversationMessage
from app.schemas.document import RetrievedDocumentChunk


def chat_response(content: str, total_tokens: int = 123):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(total_tokens=total_tokens),
    )


def chunk(content: str = "Database normalization reduces redundancy."):
    return RetrievedDocumentChunk(
        chunk_id=9,
        document_id=5,
        page_number=2,
        chunk_index=0,
        content=content,
        token_count=8,
        distance=0.1,
        score=0.9,
    )


class GenerationProviderInterfaceTest(unittest.TestCase):
    def test_rejects_blank_model_name(self) -> None:
        class EmptyModelProvider(GenerationProvider):
            def __init__(self) -> None:
                super().__init__("")

            def generate_answer(self, **_kwargs):
                raise AssertionError("not used")

        with self.assertRaises(ValueError):
            EmptyModelProvider()


class OpenAIGenerationProviderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = MagicMock()

    def _provider(self, **overrides) -> OpenAIGenerationProvider:
        parameters = {
            "client": self.client,
            "model_name": "gpt-4o-mini",
            "max_retries": 1,
            "retry_base_delay_seconds": 0.25,
            "request_timeout_seconds": 5.0,
            "sleep": MagicMock(),
        }
        parameters.update(overrides)
        return OpenAIGenerationProvider(**parameters)

    def test_generates_answer_with_grounded_prompt_and_usage(self) -> None:
        self.client.chat.completions.create.return_value = chat_response(
            "Normalization organizes data into normal forms.",
            total_tokens=77,
        )
        provider = self._provider()
        history = [
            ConversationMessage(role="user", content="What is this about?"),
            ConversationMessage(role="assistant", content="It is about databases."),
        ]

        result = provider.generate_answer(
            question="What is normalization?",
            language="en",
            history=history,
            chunks=[chunk()],
        )

        self.assertEqual(
            result.answer,
            "Normalization organizes data into normal forms.",
        )
        self.assertEqual(result.tokens_used, 77)
        self.client.chat.completions.create.assert_called_once()
        call = self.client.chat.completions.create.call_args.kwargs
        self.assertEqual(call["model"], "gpt-4o-mini")
        self.assertEqual(call["temperature"], 0.2)
        self.assertEqual(call["timeout"], 5.0)
        self.assertIn("Answer only from the supplied document context", call["messages"][0]["content"])
        self.assertIn("Use plain text only", call["messages"][0]["content"])
        user_prompt = call["messages"][1]["content"]
        self.assertIn("Conversation history", user_prompt)
        self.assertIn("User: What is this about?", user_prompt)
        self.assertIn("chunk_id=9", user_prompt)
        self.assertIn("Database normalization reduces redundancy.", user_prompt)
        self.assertIn("Question:\nWhat is normalization?", user_prompt)

    def test_summary_question_gets_broader_prompt_budget(self) -> None:
        self.client.chat.completions.create.return_value = chat_response(
            "A broader summary.",
            total_tokens=91,
        )
        provider = self._provider()

        result = provider.generate_answer(
            question="Summarize the main points of the document.",
            language="en",
            history=[],
            chunks=[chunk("Information, data, and knowledge are discussed.")],
        )

        self.assertEqual(result.answer, "A broader summary.")
        call = self.client.chat.completions.create.call_args.kwargs
        self.assertEqual(call["max_tokens"], 700)
        self.assertIn("cover all major ideas", call["messages"][0]["content"])

    def test_retries_timeout_then_succeeds(self) -> None:
        timeout = APITimeoutError(request=httpx.Request("POST", "https://api.test"))
        self.client.chat.completions.create.side_effect = [
            timeout,
            chat_response("Recovered answer."),
        ]
        sleep = MagicMock()
        provider = self._provider(sleep=sleep)

        result = provider.generate_answer(
            question="Q?",
            language="en",
            history=[],
            chunks=[chunk()],
        )

        self.assertEqual(result.answer, "Recovered answer.")
        self.assertEqual(self.client.chat.completions.create.call_count, 2)
        sleep.assert_called_once_with(0.25)

    def test_returns_provider_unavailable_after_retry_limit(self) -> None:
        timeout = APITimeoutError(request=httpx.Request("POST", "https://api.test"))
        self.client.chat.completions.create.side_effect = [timeout, timeout]
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.generate_answer(
                question="Q?",
                language="en",
                history=[],
                chunks=[chunk()],
            )

        self.assertEqual(context.exception.code, ErrorCode.PROVIDER_UNAVAILABLE)
        self.assertEqual(context.exception.status_code, 503)

    def test_does_not_retry_non_transient_error(self) -> None:
        self.client.chat.completions.create.side_effect = ValueError("bad payload")
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.generate_answer(
                question="Q?",
                language="en",
                history=[],
                chunks=[chunk()],
            )

        self.assertEqual(context.exception.code, ErrorCode.GENERATION_ERROR)
        self.assertEqual(self.client.chat.completions.create.call_count, 1)

    def test_strips_basic_markdown_from_answer(self) -> None:
        markdown_answer = (
            "### Summary\n\n"
            "1. ***Information***: Raw facts.\n"
            "2. __Knowledge__: Processed information."
        )
        self.client.chat.completions.create.return_value = chat_response(
            markdown_answer,
            total_tokens=84,
        )
        provider = self._provider()

        result = provider.generate_answer(
            question="Summarize the document.",
            language="en",
            history=[],
            chunks=[chunk()],
        )

        self.assertEqual(
            result.answer,
            "Summary\n\n1. Information: Raw facts.\n2. Knowledge: Processed information.",
        )

    def test_rejects_empty_or_malformed_output(self) -> None:
        provider = self._provider()
        invalid_responses = (
            chat_response("   "),
            SimpleNamespace(choices=[]),
        )

        for response in invalid_responses:
            with self.subTest(response=response):
                self.client.chat.completions.create.return_value = response
                with self.assertRaises(ServiceError) as context:
                    provider.generate_answer(
                        question="Q?",
                        language="en",
                        history=[],
                        chunks=[chunk()],
                    )
                self.assertEqual(context.exception.code, ErrorCode.INVALID_OUTPUT)

    def test_rejects_invalid_generation_input(self) -> None:
        provider = self._provider()

        with self.assertRaises(ServiceError) as context:
            provider.generate_answer(
                question="  ",
                language="en",
                history=[],
                chunks=[chunk()],
            )
        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)

        with self.assertRaises(ServiceError) as context:
            provider.generate_answer(
                question="Q?",
                language="en",
                history=[],
                chunks=[],
            )
        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)

    def test_rejects_invalid_configuration(self) -> None:
        invalid_options = (
            {"max_retries": -1},
            {"retry_base_delay_seconds": -0.1},
            {"request_timeout_seconds": 0},
        )

        for options in invalid_options:
            with self.subTest(options=options):
                with self.assertRaises(ValueError):
                    self._provider(**options)

    @patch("app.generation.openai_provider.OpenAI")
    def test_creates_openai_client_with_sdk_retries_disabled(self, openai_mock) -> None:
        client = MagicMock()
        openai_mock.return_value = client

        provider = OpenAIGenerationProvider(
            api_key="test-key",
            model_name="gpt-4o-mini",
            max_retries=0,
            retry_base_delay_seconds=0,
            request_timeout_seconds=5,
        )

        self.assertIs(provider.client, client)
        openai_mock.assert_called_once_with(api_key="test-key", max_retries=0)

    @patch("app.generation.openai_provider.settings", SimpleNamespace(openai_api_key=""))
    def test_requires_api_key_when_client_is_not_injected(self) -> None:
        with self.assertRaises(ValueError):
            OpenAIGenerationProvider(
                api_key="",
                model_name="gpt-4o-mini",
                max_retries=0,
                retry_base_delay_seconds=0,
                request_timeout_seconds=5,
            )


if __name__ == "__main__":
    unittest.main()