"""Trích xuất text theo từng trang từ PDF có text layer."""

import pymupdf

from app.core.errors import ErrorCode, ServiceError
from app.parsers.base import DocumentParser
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ParsedPage,
    ValidatedDocument,
)


class PdfDocumentParser(DocumentParser):
    """PDF parser dùng PyMuPDF; MVP không thực hiện OCR cho PDF scan."""

    supported_type = DocumentFileType.PDF

    def _parse(self, document: ValidatedDocument) -> ParsedDocument:
        """Đọc PDF, giữ tổng số trang và chỉ trả các trang có text."""
        try:
            with pymupdf.open(document.path) as pdf_document:
                page_count = pdf_document.page_count
                pages = self._extract_pages(pdf_document)
        except Exception as exc:
            # Không trả exception nội bộ của parser ra Backend. API chỉ cần biết
            # file không thể parse và log vẫn giữ nguyên exception qua chaining.
            raise ServiceError(
                ErrorCode.PARSER_ERROR,
                "Không thể đọc nội dung học liệu PDF",
                status_code=422,
            ) from exc

        # PDF scan thường có trang nhưng get_text() không trả text.
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
    def _extract_pages(pdf_document: pymupdf.Document) -> list[ParsedPage]:
        """Trích text theo vị trí glyph và đánh số trang từ 1.

        PyMuPDF tái tạo từ tiếng Việt tốt hơn cách đọc tuần tự content stream,
        tránh các lỗi như ``nh\nững``, ``liệ u`` hoặc ``đ ược`` trên PDF có font
        và layout phức tạp. ``sort=False`` giữ thứ tự nội dung gốc của trang;
        cleaner sẽ tiếp tục chuẩn hóa whitespace ở bước sau.
        """
        pages: list[ParsedPage] = []
        for page_number, page in enumerate(pdf_document, start=1):
            extracted_text = page.get_text("text", sort=False) or ""
            content = PdfDocumentParser._normalize_extracted_text(extracted_text)
            if content:
                pages.append(
                    ParsedPage(page_number=page_number, content=content)
                )
        return pages

    @staticmethod
    def _normalize_extracted_text(text: str) -> str:
        """Bỏ khoảng trắng căn tọa độ ở hai đầu nhưng giữ cấu trúc dòng."""
        return "\n".join(line.strip() for line in text.splitlines()).strip()
