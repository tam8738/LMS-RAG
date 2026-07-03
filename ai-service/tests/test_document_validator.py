"""Kiểm thử validation size, extension, PDF signature và TXT encoding."""

import tempfile
import unittest
from pathlib import Path

from app.core.errors import ErrorCode, ServiceError
from app.schemas.document import DocumentFileType
from app.services.document_validator import DocumentValidator


class DocumentValidatorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_directory.name)
        self.validator = DocumentValidator(max_file_size_bytes=64)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_accepts_pdf_with_matching_extension_and_signature(self) -> None:
        path = self._write_bytes("source.pdf", b"%PDF-1.7\nexample")

        result = self.validator.validate(
            path,
            "documents/12/source.pdf",
            DocumentFileType.PDF,
        )

        self.assertEqual(result.file_type, DocumentFileType.PDF)
        self.assertEqual(result.media_type, "application/pdf")
        self.assertEqual(result.size_bytes, path.stat().st_size)

    def test_accepts_utf8_sig_txt(self) -> None:
        content = "Nội dung học liệu".encode("utf-8-sig")
        path = self._write_bytes("source.txt", content)

        result = self.validator.validate(
            path,
            "documents/12/source.txt",
            DocumentFileType.TXT,
        )

        self.assertEqual(result.media_type, "text/plain")

    def test_rejects_missing_file(self) -> None:
        self._assert_error(
            self.root / "missing.pdf",
            DocumentFileType.PDF,
            ErrorCode.FILE_NOT_FOUND,
            404,
        )

    def test_rejects_directory(self) -> None:
        directory = self.root / "source.pdf"
        directory.mkdir()
        self._assert_error(
            directory,
            DocumentFileType.PDF,
            ErrorCode.FILE_NOT_FOUND,
            404,
        )

    def test_rejects_file_over_size_limit(self) -> None:
        path = self._write_bytes("source.txt", b"a" * 65)
        self._assert_error(
            path,
            DocumentFileType.TXT,
            ErrorCode.FILE_TOO_LARGE,
            413,
        )

    def test_accepts_file_at_size_limit(self) -> None:
        path = self._write_bytes("source.txt", b"a" * 64)

        result = self.validator.validate(
            path,
            "documents/12/source.txt",
            DocumentFileType.TXT,
        )

        self.assertEqual(result.size_bytes, 64)

    def test_rejects_empty_file(self) -> None:
        path = self._write_bytes("source.txt", b"")
        self._assert_error(
            path,
            DocumentFileType.TXT,
            ErrorCode.EMPTY_DOCUMENT,
            422,
        )

    def test_rejects_whitespace_only_txt(self) -> None:
        path = self._write_bytes("source.txt", b" \r\n\t")
        self._assert_error(
            path,
            DocumentFileType.TXT,
            ErrorCode.EMPTY_DOCUMENT,
            422,
        )

    def test_rejects_extension_that_does_not_match_declared_type(self) -> None:
        path = self._write_bytes("source.txt", b"%PDF-1.7")
        self._assert_error(
            path,
            DocumentFileType.PDF,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            422,
        )

    def test_rejects_pdf_without_pdf_signature(self) -> None:
        path = self._write_bytes("source.pdf", b"not a pdf")
        self._assert_error(
            path,
            DocumentFileType.PDF,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            422,
        )

    def test_rejects_binary_content_disguised_as_txt(self) -> None:
        path = self._write_bytes("source.txt", b"text\x00binary")
        self._assert_error(
            path,
            DocumentFileType.TXT,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            422,
        )

    def test_rejects_txt_with_invalid_utf8(self) -> None:
        path = self._write_bytes("source.txt", b"\xff\xfeinvalid")
        self._assert_error(
            path,
            DocumentFileType.TXT,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            422,
        )

    def _write_bytes(self, name: str, content: bytes) -> Path:
        path = self.root / name
        path.write_bytes(content)
        return path

    def _assert_error(
        self,
        path: Path,
        file_type: DocumentFileType,
        expected_code: ErrorCode,
        expected_status: int,
    ) -> None:
        with self.assertRaises(ServiceError) as context:
            self.validator.validate(path, f"documents/12/{path.name}", file_type)

        self.assertEqual(context.exception.code, expected_code)
        self.assertEqual(context.exception.status_code, expected_status)


if __name__ == "__main__":
    unittest.main()