from pathlib import Path

from app.core.config import settings
from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.schemas.document import DocumentFileType, ValidatedDocument

PDF_SIGNATURE = b"%PDF-"


class DocumentValidator:
    def __init__(self, max_file_size_bytes: int | None = None) -> None:
        self.max_file_size_bytes = (
            max_file_size_bytes
            if max_file_size_bytes is not None
            else settings.max_file_size_bytes
        )

    def validate(
        self,
        path: Path,
        storage_key: str,
        file_type: DocumentFileType,
    ) -> ValidatedDocument:
        if not path.exists() or not path.is_file():
            raise ServiceError(
                ErrorCode.FILE_NOT_FOUND,
                "Không tìm thấy học liệu trong shared storage",
                status_code=404,
                details=[ErrorDetail(field="storage_key", message=storage_key)],
            )

        size_bytes = path.stat().st_size
        if size_bytes > self.max_file_size_bytes:
            raise ServiceError(
                ErrorCode.FILE_TOO_LARGE,
                "Kích thước học liệu vượt quá giới hạn cho phép",
                status_code=413,
                details=[
                    ErrorDetail(
                        field="storage_key",
                        message=(
                            f"File có kích thước {size_bytes} byte, "
                            f"giới hạn là {self.max_file_size_bytes} byte"
                        ),
                    )
                ],
            )

        if size_bytes == 0:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Học liệu không có nội dung",
                status_code=422,
            )

        if path.suffix.lower() != file_type.extension:
            raise self._unsupported_type(
                f"Phần mở rộng phải là {file_type.extension}"
            )

        if file_type is DocumentFileType.PDF:
            self._validate_pdf(path)
        elif file_type is DocumentFileType.TXT:
            self._validate_txt(path)

        return ValidatedDocument(
            storage_key=storage_key,
            path=path,
            file_type=file_type,
            media_type=file_type.media_type,
            size_bytes=size_bytes,
        )

    def _validate_pdf(self, path: Path) -> None:
        with path.open("rb") as file:
            signature = file.read(len(PDF_SIGNATURE))

        if signature != PDF_SIGNATURE:
            raise self._unsupported_type(
                "Nội dung file không có chữ ký hợp lệ của PDF"
            )

    def _validate_txt(self, path: Path) -> None:
        content = path.read_bytes()
        if b"\x00" in content:
            raise self._unsupported_type(
                "File TXT chứa dữ liệu nhị phân không được hỗ trợ"
            )

        try:
            decoded_content = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise self._unsupported_type(
                "File TXT phải sử dụng encoding UTF-8 hoặc UTF-8-SIG"
            ) from exc

        if not decoded_content.strip():
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Học liệu không có nội dung văn bản",
                status_code=422,
            )

    @staticmethod
    def _unsupported_type(message: str) -> ServiceError:
        return ServiceError(
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            "Loại học liệu không được hỗ trợ hoặc không khớp nội dung",
            status_code=422,
            details=[ErrorDetail(field="file_type", message=message)],
        )