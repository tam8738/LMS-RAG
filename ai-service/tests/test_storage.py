"""Kiểm thử StorageResolver chống absolute path và path traversal."""

import tempfile
import unittest
from pathlib import Path

from app.core.errors import ErrorCode, ServiceError
from app.services.storage import StorageResolver


class StorageResolverTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.upload_root = Path(self.temp_directory.name)
        self.resolver = StorageResolver(self.upload_root)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def test_resolves_valid_relative_storage_key(self) -> None:
        result = self.resolver.resolve("documents/12/source.pdf")

        self.assertEqual(
            result,
            self.upload_root.resolve() / "documents" / "12" / "source.pdf",
        )

    def test_rejects_empty_storage_key(self) -> None:
        self._assert_invalid_key("  ")

    def test_rejects_posix_absolute_path(self) -> None:
        self._assert_invalid_key("/etc/passwd")

    def test_rejects_windows_absolute_path(self) -> None:
        self._assert_invalid_key(r"C:\uploads\source.pdf")

    def test_rejects_windows_drive_relative_path(self) -> None:
        self._assert_invalid_key(r"C:source.pdf")

    def test_rejects_posix_parent_traversal(self) -> None:
        self._assert_invalid_key("documents/../secret.txt")

    def test_rejects_backslash_path(self) -> None:
        self._assert_invalid_key(r"documents\12\source.pdf")

    def test_rejects_windows_alternate_data_stream(self) -> None:
        self._assert_invalid_key("documents/12/source.pdf:secret")

    def _assert_invalid_key(self, storage_key: str) -> None:
        with self.assertRaises(ServiceError) as context:
            self.resolver.resolve(storage_key)

        self.assertEqual(context.exception.code, ErrorCode.INVALID_INPUT)
        self.assertEqual(context.exception.status_code, 422)
        self.assertEqual(context.exception.details[0].field, "storage_key")


if __name__ == "__main__":
    unittest.main()