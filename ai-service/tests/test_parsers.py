import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from pypdf import PdfWriter

from app.core.errors import ErrorCode, ServiceError
from app.parsers.factory import DocumentParserFactory
from app.parsers.pdf import PdfDocumentParser
from app.parsers.txt import TxtDocumentParser
from app.schemas.document import DocumentFileType, ValidatedDocument


class StubPdfPage:
    def __init__(self, text: str | None = None, error: Exception | None = None):
        self.text = text
        self.error = error

    def extract_text(self) -> str | None:
        if self.error is not None:
            raise self.error
        return self.text


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

    @patch("app.parsers.pdf.PdfReader")
    def test_pdf_parser_extracts_text_and_preserves_page_numbers(
        self,
        reader_mock,
    ) -> None:
        reader_mock.return_value = SimpleNamespace(
            pages=[
                StubPdfPage("  Trang một  "),
                StubPdfPage("  \n"),
                StubPdfPage("Trang ba"),
            ]
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
        reader_mock.assert_called_once_with(path)

    @patch("app.parsers.pdf.PdfReader")
    def test_pdf_parser_treats_none_as_empty_page(self, reader_mock) -> None:
        reader_mock.return_value = SimpleNamespace(
            pages=[StubPdfPage(None), StubPdfPage("Nội dung")]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        result = PdfDocumentParser().parse(document)

        self.assertEqual(result.page_count, 2)
        self.assertEqual(result.pages[0].page_number, 2)

    @patch("app.parsers.pdf.PdfReader")
    def test_pdf_parser_rejects_document_without_text(self, reader_mock) -> None:
        reader_mock.return_value = SimpleNamespace(
            pages=[StubPdfPage(None), StubPdfPage(" \n")]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.EMPTY_DOCUMENT,
        )

    @patch("app.parsers.pdf.PdfReader", side_effect=ValueError("invalid PDF"))
    def test_pdf_parser_wraps_reader_error(self, _reader_mock) -> None:
        path = self._write_bytes("source.pdf", b"%PDF-broken")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    @patch("app.parsers.pdf.PdfReader")
    def test_pdf_parser_wraps_page_extraction_error(self, reader_mock) -> None:
        reader_mock.return_value = SimpleNamespace(
            pages=[StubPdfPage(error=RuntimeError("extract failed"))]
        )
        path = self._write_bytes("source.pdf", b"%PDF-1.7")
        document = self._validated_document(path, DocumentFileType.PDF)

        self._assert_parser_error(
            lambda: PdfDocumentParser().parse(document),
            ErrorCode.PARSER_ERROR,
        )

    def test_real_blank_pdf_is_empty_document(self) -> None:
        path = self.root / "blank.pdf"
        writer = PdfWriter()
        writer.add_blank_page(width=200, height=200)
        with path.open("wb") as output:
            writer.write(output)
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
            storage_key=f"documents/12/{path.name}",
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