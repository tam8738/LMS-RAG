from pathlib import Path, PurePosixPath, PureWindowsPath

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError


class StorageResolver:
    def __init__(self, upload_root: Path | None = None) -> None:
        self.upload_root = (upload_root or settings.upload_root).resolve()

    def resolve(self, storage_key: str) -> Path:
        normalized_key = storage_key.strip()
        if not normalized_key:
            raise self._invalid_key("Storage key không được để trống")

        posix_key = PurePosixPath(normalized_key)
        windows_key = PureWindowsPath(normalized_key)
        if (
            posix_key.is_absolute()
            or windows_key.is_absolute()
            or bool(windows_key.drive)
            or "\\" in normalized_key
            or ":" in normalized_key
        ):
            raise self._invalid_key("Storage key phải là đường dẫn tương đối dùng dấu '/'")

        if ".." in posix_key.parts or ".." in windows_key.parts:
            raise self._invalid_key("Storage key không được chứa '..'")

        resolved_path = (self.upload_root / Path(normalized_key)).resolve()
        if not resolved_path.is_relative_to(self.upload_root):
            raise self._invalid_key("Storage key nằm ngoài thư mục upload")

        return resolved_path

    @staticmethod
    def _invalid_key(message: str) -> ServiceError:
        return ServiceError(
            ErrorCode.INVALID_INPUT,
            "Storage key không hợp lệ",
            status_code=422,
            details=[ErrorDetail(field="storage_key", message=message)],
        )