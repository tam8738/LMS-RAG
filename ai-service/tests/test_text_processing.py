"""Kiểm thử cleaner, tokenizer, chunk boundaries, overlap và pipeline."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.core.errors import ErrorCode, ServiceError
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ParsedPage,
    ValidatedDocument,
)
from app.services.document_chunking_pipeline import DocumentChunkingPipeline
from app.services.text_chunker import TextChunker
from app.services.text_cleaner import TextCleaner
from app.services.tokenizer import Tokenizer


class CharacterTokenizer:
    def encode(self, text: str) -> list[int]:
        return [ord(character) for character in text]

    def decode(self, tokens: list[int]) -> str:
        return "".join(chr(token) for token in tokens)

    def count(self, text: str) -> int:
        return len(text)


class StaticParser:
    def __init__(self, result: ParsedDocument) -> None:
        self.result = result

    def parse(self, _document: ValidatedDocument) -> ParsedDocument:
        return self.result


class EmptyCleaner:
    def clean(self, _text: str) -> str:
        return ""


class TextCleanerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.cleaner = TextCleaner()

    def test_normalizes_line_endings_whitespace_and_blank_lines(self) -> None:
        source = "  Dòng   một\r\n\r\n\rDòng\t hai  \n\n\nDòng ba  "

        result = self.cleaner.clean(source)

        self.assertEqual(result, "Dòng một\n\nDòng hai\n\nDòng ba")

    def test_removes_unnecessary_control_characters(self) -> None:
        result = self.cleaner.clean("Nội\x00dung\x07 hợp lệ")

        self.assertEqual(result, "Nộidung hợp lệ")

    def test_preserves_fenced_and_indented_code_spacing(self) -> None:
        source = (
            "Văn   bản\n"
            "```python\n"
            "  value   =  1  \n"
            "```\n"
            "    if value:  print(value)  "
        )

        result = self.cleaner.clean(source)

        self.assertEqual(
            result,
            "Văn bản\n```python\n  value   =  1\n```\n"
            "    if value:  print(value)",
        )

    def test_returns_empty_string_for_content_without_useful_text(self) -> None:
        self.assertEqual(self.cleaner.clean("\x00\r\n\t\n"), "")


class TokenizerTest(unittest.TestCase):
    def test_encode_decode_round_trip_and_count(self) -> None:
        tokenizer = Tokenizer(model_name="text-embedding-3-small")
        text = "Chunking học liệu bằng token."

        tokens = tokenizer.encode(text)

        self.assertEqual(tokenizer.decode(tokens), text)
        self.assertEqual(tokenizer.count(text), len(tokens))

    def test_unknown_model_falls_back_to_cl100k_base(self) -> None:
        tokenizer = Tokenizer(model_name="model-khong-ton-tai")

        self.assertGreater(tokenizer.count("Nội dung"), 0)

    def test_special_token_text_is_treated_as_normal_content(self) -> None:
        tokenizer = Tokenizer(encoding_name="cl100k_base")

        self.assertGreater(tokenizer.count("<|endoftext|>"), 0)


class TextChunkerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tokenizer = CharacterTokenizer()

    def test_rejects_invalid_configuration(self) -> None:
        invalid_values = ((0, 0), (10, -1), (10, 10), (10, 11))

        for chunk_size, overlap in invalid_values:
            with self.subTest(chunk_size=chunk_size, overlap=overlap):
                with self.assertRaises(ValueError):
                    TextChunker(self.tokenizer, chunk_size, overlap)

    def test_rejects_empty_text(self) -> None:
        chunker = TextChunker(self.tokenizer, chunk_size=10, chunk_overlap=2)

        with self.assertRaises(ServiceError) as context:
            chunker.chunk("  \n", page_number=1)

        self.assertEqual(context.exception.code, ErrorCode.EMPTY_DOCUMENT)

    def test_short_text_creates_one_chunk_with_metadata(self) -> None:
        chunker = TextChunker(self.tokenizer, chunk_size=20, chunk_overlap=3)

        chunks = chunker.chunk("Nội dung", page_number=4, start_index=7)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].page_number, 4)
        self.assertEqual(chunks[0].chunk_index, 7)
        self.assertEqual(chunks[0].content, "Nội dung")
        self.assertEqual(chunks[0].token_count, 8)

    def test_long_text_respects_size_and_exact_overlap(self) -> None:
        chunker = TextChunker(self.tokenizer, chunk_size=8, chunk_overlap=3)

        chunks = chunker.chunk("abcdefghijklmno", page_number=1)

        self.assertEqual(
            [chunk.content for chunk in chunks],
            ["abcdefgh", "fghijklm", "klmno"],
        )
        for previous, current in zip(chunks, chunks[1:]):
            self.assertEqual(previous.content[-3:], current.content[:3])
        self.assertTrue(all(chunk.token_count <= 8 for chunk in chunks))

    def test_prefers_paragraph_boundary(self) -> None:
        chunker = TextChunker(self.tokenizer, chunk_size=30, chunk_overlap=0)
        text = "A" * 14 + "\n\n" + "B" * 14 + "\n\n" + "C" * 14

        chunks = chunker.chunk(text, page_number=2)

        self.assertEqual(chunks[0].content, "A" * 14)
        self.assertEqual(chunks[1].content, "B" * 14 + "\n\n" + "C" * 14)

    def test_falls_back_to_sentence_boundary(self) -> None:
        chunker = TextChunker(self.tokenizer, chunk_size=35, chunk_overlap=0)
        text = "Câu đầu tiên đủ dài. Câu thứ hai cũng khá dài để kiểm tra."

        chunks = chunker.chunk(text, page_number=1)

        self.assertEqual(chunks[0].content, "Câu đầu tiên đủ dài.")
        self.assertTrue(chunks[1].content.startswith("Câu thứ hai"))

    def test_real_tokenizer_never_exceeds_token_limit(self) -> None:
        chunker = TextChunker(
            Tokenizer(model_name="text-embedding-3-small"),
            chunk_size=12,
            chunk_overlap=3,
        )
        text = " ".join(["Hệ thống RAG xử lý học liệu hiệu quả."] * 12)

        chunks = chunker.chunk(text, page_number=None)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(chunk.token_count <= 12 for chunk in chunks))
        self.assertTrue(all("�" not in chunk.content for chunk in chunks))
        self.assertEqual(
            [chunk.chunk_index for chunk in chunks],
            list(range(len(chunks))),
        )


class DocumentChunkingPipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_runs_real_txt_parse_clean_chunk_pipeline(self) -> None:
        path = self.root / "source.txt"
        path.write_text("  Dòng   một.\n\nDòng hai dài hơn.  ", encoding="utf-8")
        document = self._validated_document(path, DocumentFileType.TXT)
        pipeline = DocumentChunkingPipeline(
            chunker=TextChunker(
                CharacterTokenizer(),
                chunk_size=18,
                chunk_overlap=4,
            )
        )

        result = pipeline.run(document)

        self.assertEqual(result.file_type, DocumentFileType.TXT)
        self.assertEqual(result.page_count, 1)
        self.assertGreater(result.chunk_count, 1)
        self.assertEqual(
            [chunk.chunk_index for chunk in result.chunks],
            list(range(result.chunk_count)),
        )
        self.assertTrue(
            all(chunk.page_number is None for chunk in result.chunks)
        )
        self.assertNotIn("   ", "".join(chunk.content for chunk in result.chunks))

    @patch("app.services.document_chunking_pipeline.DocumentParserFactory.create")
    def test_preserves_pages_and_global_chunk_indexes(self, create_mock) -> None:
        parsed = ParsedDocument(
            file_type=DocumentFileType.PDF,
            page_count=2,
            pages=[
                ParsedPage(page_number=1, content="abcdefghijk"),
                ParsedPage(page_number=2, content="lmnopqrstuv"),
            ],
        )
        create_mock.return_value = StaticParser(parsed)
        path = self.root / "source.pdf"
        path.write_bytes(b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)
        pipeline = DocumentChunkingPipeline(
            chunker=TextChunker(
                CharacterTokenizer(),
                chunk_size=7,
                chunk_overlap=2,
            )
        )

        result = pipeline.run(document)

        self.assertEqual(result.page_count, 2)
        self.assertEqual(
            [chunk.chunk_index for chunk in result.chunks],
            list(range(result.chunk_count)),
        )
        self.assertEqual(
            sorted({chunk.page_number for chunk in result.chunks}),
            [1, 2],
        )

    @patch("app.services.document_chunking_pipeline.DocumentParserFactory.create")
    def test_rejects_document_empty_after_cleaning(self, create_mock) -> None:
        parsed = ParsedDocument(
            file_type=DocumentFileType.TXT,
            page_count=1,
            pages=[ParsedPage(page_number=None, content="Nội dung")],
        )
        create_mock.return_value = StaticParser(parsed)
        path = self.root / "source.txt"
        path.write_text("Nội dung", encoding="utf-8")
        document = self._validated_document(path, DocumentFileType.TXT)
        pipeline = DocumentChunkingPipeline(
            cleaner=EmptyCleaner(),  # type: ignore[arg-type]
            chunker=TextChunker(
                CharacterTokenizer(),
                chunk_size=10,
                chunk_overlap=2,
            ),
        )

        with self.assertRaises(ServiceError) as context:
            pipeline.run(document)

        self.assertEqual(context.exception.code, ErrorCode.EMPTY_DOCUMENT)

    @staticmethod
    def _validated_document(
        path: Path,
        file_type: DocumentFileType,
    ) -> ValidatedDocument:
        return ValidatedDocument(
            storage_key=f"documents/12/v1/{path.name}",
            path=path,
            file_type=file_type,
            media_type=file_type.media_type,
            size_bytes=path.stat().st_size,
        )


if __name__ == "__main__":
    unittest.main()
