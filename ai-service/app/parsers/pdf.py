"""Trích xuất text theo từng trang từ PDF có text layer."""

from pypdf import PdfReader

from app.core.errors import ErrorCode, ServiceError
from app.parsers.base import DocumentParser
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ParsedPage,
    ValidatedDocument,
)


class PdfDocumentParser(DocumentParser):
    """PDF parser dùng pypdf; MVP không thực hiện OCR cho PDF scan."""

    supported_type = DocumentFileType.PDF

    def _parse(self, document: ValidatedDocument) -> ParsedDocument:
        """Đọc PDF, giữ tổng số trang và chỉ trả các trang có text."""
        try:
            reader = PdfReader(document.path)
            page_count = len(reader.pages)
            pages = self._extract_pages(reader)
        except Exception as exc:
            # Không trả exception nội bộ của pypdf ra Backend. API chỉ cần biết
            # file không thể parse và log vẫn giữ nguyên exception qua chaining.
            raise ServiceError(
                ErrorCode.PARSER_ERROR,
                "Không thể đọc nội dung học liệu PDF",
                status_code=422,
            ) from exc

        # PDF scan thường có trang nhưng extract_text() không trả text.
        if not pages:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không trích xuất được văn bản từ học liệu PDF",
                status_code=422,
            )

        return ParsedDocument(
            file_type=self.supported_type,
            page_count=page_count,
            pages=pages,
        )

    @staticmethod
    def _extract_pages(reader: PdfReader) -> list[ParsedPage]:
        """Trích text và đánh số trang từ 1 để khớp cách người dùng đọc PDF."""
        pages: list[ParsedPage] = []
        for page_number, page in enumerate(reader.pages, start=1):
            content = (page.extract_text() or "").strip()
            if content:
                pages.append(
                    ParsedPage(page_number=page_number, content=content)
                )
        return pages