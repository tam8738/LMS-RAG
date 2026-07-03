"""Resolve storage key của Backend thành đường dẫn file an toàn."""

from pathlib import Path, PurePosixPath, PureWindowsPath

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError


class StorageResolver:
    """Ngăn storage key thoát khỏi ``UPLOAD_ROOT`` bằng path traversal."""

    def __init__(self, upload_root: Path | None = None) -> None:
        """Cho phép inject upload root tạm trong test, mặc định lấy từ settings."""
        self.upload_root = (upload_root or settings.upload_root).resolve()

    def resolve(self, storage_key: str) -> Path:
        """Kiểm tra storage key và trả đường dẫn tuyệt đối dưới upload root.

        Hàm chưa kiểm tra file tồn tại; trách nhiệm đó thuộc
        ``DocumentValidator``. Tách hai bước giúp kiểm tra bảo mật đường dẫn
        độc lập với kiểm tra nội dung file.
        """
        normalized_key = storage_key.strip()
        if not normalized_key:
            raise self._invalid_key("Storage key không được để trống")

        # Phân tích theo cả hai hệ điều hành. AI có thể chạy Linux trong Docker
        # nhưng nhận chuỗi được tạo hoặc thử khai thác từ máy Windows.
        posix_key = PurePosixPath(normalized_key)
        windows_key = PureWindowsPath(normalized_key)
        if (
            posix_key.is_absolute()
            or windows_key.is_absolute()
            or bool(windows_key.drive)
            or "\\" in normalized_key
            or ":" in normalized_key
        ):
            raise self._invalid_key(
                "Storage key phải là đường dẫn tương đối dùng dấu '/'"
            )

        # ``..`` có thể đưa đường dẫn ra thư mục cha nên luôn bị từ chối.
        if ".." in posix_key.parts or ".." in windows_key.parts:
            raise self._invalid_key("Storage key không được chứa '..'")

        resolved_path = (self.upload_root / Path(normalized_key)).resolve()

        # Kiểm tra lần cuối sau resolve để chặn cả symbolic link trỏ ra ngoài.
        if not resolved_path.is_relative_to(self.upload_root):
            raise self._invalid_key("Storage key nằm ngoài thư mục upload")

        return resolved_path

    @staticmethod
    def _invalid_key(message: str) -> ServiceError:
        """Tạo lỗi storage_key thống nhất cho mọi nhánh validation."""
        return ServiceError(
            ErrorCode.INVALID_INPUT,
            "Storage key không hợp lệ",
            status_code=422,
            details=[ErrorDetail(field="storage_key", message=message)],
        )