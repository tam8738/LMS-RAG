"""Đọc học liệu TXT UTF-8 thành một logical page."""

from app.core.errors import ErrorCode, ServiceError
from app.parsers.base import DocumentParser
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ParsedPage,
    ValidatedDocument,
)


class TxtDocumentParser(DocumentParser):
    """TXT parser hỗ trợ UTF-8 và UTF-8-SIG (file có BOM)."""

    supported_type = DocumentFileType.TXT

    def _parse(self, document: ValidatedDocument) -> ParsedDocument:
        """Đọc toàn bộ TXT; TXT không có số trang nên dùng ``None``."""
        try:
            # utf-8-sig tự loại BOM nhưng vẫn đọc được UTF-8 không có BOM.
            content = document.path.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError) as exc:
            raise ServiceError(
                ErrorCode.PARSER_ERROR,
                "Không thể đọc nội dung học liệu TXT",
                status_code=422,
            ) from exc

        content = content.strip()
        if not content:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không trích xuất được văn bản từ học liệu TXT",
                status_code=422,
            )

        return ParsedDocument(
            file_type=self.supported_type,
            page_count=1,
            pages=[ParsedPage(page_number=None, content=content)],
        )