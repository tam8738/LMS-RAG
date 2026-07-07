"""Kiểm thử PDF/TXT parsers và parser factory mà không cần OCR."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from app.core.errors import ErrorCode, ServiceError
from app.parsers.factory import DocumentParserFactory
from app.parsers.pdf import PdfDocumentParser
from app.parsers.txt import TxtDocumentParser
from app.schemas.document import DocumentFileType, ValidatedDocument


class StubPdfPage:
    def __init__(self, text: str | None = None, error: Exception | None = None):
        self.text = text
        self.error = error
        self.get_text_calls: list[tuple[str, bool]] = []

    def get_text(self, output_type: str, *, sort: bool = False) -> str | None:
        self.get_text_calls.append((output_type, sort))
        if self.error is not None:
            raise self.error
        return self.text


class StubPdfDocument:
    def __init__(self, pages: list[StubPdfPage]):
        self.pages = pages
        self.page_count = len(pages)

    def __iter__(self):
        return iter(self.pages)

    def __enter__(self):
        return self

    def __exit__(self, _exc_type, _exc, _traceback) -> None:
        return None


class ParserTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_txt_parser_reads_utf8_and_trims_outer_whitespace(self) -> None:
        path = self._write_bytes("source.txt", "  Nội dung bài học  ".encode())
        document = self._validated_document(path, DocumentFileType.TXT)

        result = TxtDocumentParser().parse(document)

        self.assertEqual(result.file_type, DocumentFileType.TXT)
        self.assertEqual(result.page_count, 1)
        self.assertEqual(len(result.pages), 1)
        self.assertIsNone(result.pages[0].page_number)
        self.assertEqual(result.pages[0].content, "Nội dung bài học")

    def test_txt_parser_reads_utf8_sig_without_returning_bom(self) -> None:
        path = self._write_bytes(
            "source.txt",
            "Nội dung có BOM".encode("utf-8-sig"),
        )
        document = self._validated_document(path, DocumentFileType.TXT)

        result = TxtDocumentParser().parse(document)

        self.assertEqual(result.pages[0].content, "Nội dung có BOM")

    def test_txt_parser_rejects_whitespace_only_content(self) -> None:
        path = self._write_bytes("source.txt", b" \r\n\t")
        document = self._validated_document(path, DocumentFileType.TXT)

        self._assert_parser_error(
            lambda: TxtDocumentParser().parse(document),
            ErrorCode.EMPTY_DOCUMENT,
        )

    def test_txt_parser_wraps_invalid_encoding_as_parser_error(self) -> None:
        path = self._write_bytes("source.txt", b"\xff\xfeinvalid")
        document = self._validated_document(path, DocumentFileType.TXT)

        self._assert_parser_error(
            lambda: TxtDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    def test_txt_parser_wraps_missing_file_as_parser_error(self) -> None:
        path = self.root / "missing.txt"
        document = self._validated_document(path, DocumentFileType.TXT)

        self._assert_parser_error(
            lambda: TxtDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    def test_parser_interface_rejects_mismatched_file_type(self) -> None:
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: TxtDocumentParser().parse(document),
            ErrorCode.INVALID_INPUT,
        )

    @patch("app.parsers.pdf.pymupdf.open")
    def test_pdf_parser_extracts_text_and_preserves_page_numbers(
        self,
        open_mock,
    ) -> None:
        first_page = StubPdfPage("  Trang một  ")
        empty_page = StubPdfPage("  \n")
        third_page = StubPdfPage("Trang ba")
        open_mock.return_value = StubPdfDocument(
            [first_page, empty_page, third_page]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        result = PdfDocumentParser().parse(document)

        self.assertEqual(result.file_type, DocumentFileType.PDF)
        self.assertEqual(result.page_count, 3)
        self.assertEqual(
            [page.page_number for page in result.pages],
            [1, 3],
        )
        self.assertEqual(
            [page.content for page in result.pages],
            ["Trang một", "Trang ba"],
        )
        open_mock.assert_called_once_with(path)
        self.assertEqual(first_page.get_text_calls, [("text", False)])
        self.assertEqual(empty_page.get_text_calls, [("text", False)])
        self.assertEqual(third_page.get_text_calls, [("text", False)])

    @patch("app.parsers.pdf.pymupdf.open")
    def test_pdf_parser_removes_alignment_whitespace(
        self,
        open_mock,
    ) -> None:
        open_mock.return_value = StubPdfDocument(
            [
                StubPdfPage(
                    "        HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG\n"
                    "\n"
                    "                    BÀI   GIẢNG        "
                )
            ]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        result = PdfDocumentParser().parse(document)

        self.assertEqual(
            result.pages[0].content,
            "HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG\n\nBÀI   GIẢNG",
        )

    @patch("app.parsers.pdf.pymupdf.open")
    def test_pdf_parser_treats_none_as_empty_page(self, open_mock) -> None:
        open_mock.return_value = StubPdfDocument(
            [StubPdfPage(None), StubPdfPage("Nội dung")]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        result = PdfDocumentParser().parse(document)

        self.assertEqual(result.page_count, 2)
        self.assertEqual(result.pages[0].page_number, 2)

    @patch("app.parsers.pdf.pymupdf.open")
    def test_pdf_parser_rejects_document_without_text(self, open_mock) -> None:
        open_mock.return_value = StubPdfDocument(
            [StubPdfPage(None), StubPdfPage(" \n")]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.EMPTY_DOCUMENT,
        )

    @patch(
        "app.parsers.pdf.pymupdf.open",
        side_effect=ValueError("invalid PDF"),
    )
    def test_pdf_parser_wraps_reader_error(self, _open_mock) -> None:
        path = self._write_bytes("source.pdf", b"%PDF-broken")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    @patch("app.parsers.pdf.pymupdf.open")
    def test_pdf_parser_wraps_page_extraction_error(self, open_mock) -> None:
        open_mock.return_value = StubPdfDocument(
            [StubPdfPage(error=RuntimeError("extract failed"))]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    def test_real_blank_pdf_is_empty_document(self) -> None:
        path = self.root / "blank.pdf"
        with pymupdf.open() as pdf_document:
            pdf_document.new_page(width=200, height=200)
            pdf_document.save(path)
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.EMPTY_DOCUMENT,
        )

    def test_factory_creates_pdf_parser(self) -> None:
        parser = DocumentParserFactory.create(DocumentFileType.PDF)

        self.assertIsInstance(parser, PdfDocumentParser)

    def test_factory_creates_txt_parser(self) -> None:
        parser = DocumentParserFactory.create(DocumentFileType.TXT)

        self.assertIsInstance(parser, TxtDocumentParser)

    def test_factory_rejects_unsupported_file_type(self) -> None:
        self._assert_parser_error(
            lambda: DocumentParserFactory.create("DOCX"),  # type: ignore[arg-type]
            ErrorCode.UNSUPPORTED_FILE_TYPE,
        )

    def _write_bytes(self, name: str, content: bytes) -> Path:
        path = self.root / name
        path.write_bytes(content)
        return path

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
            size_bytes=path.stat().st_size if path.exists() else 0,
        )

    def _assert_parser_error(
        self,
        action,
        expected_code: ErrorCode,
    ) -> None:
        with self.assertRaises(ServiceError) as context:
            action()

        self.assertEqual(context.exception.code, expected_code)
        self.assertEqual(context.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
