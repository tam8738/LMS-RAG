"""Chọn parser phù hợp mà không để pipeline chứa nhiều nhánh if/elif."""

from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.parsers.base import DocumentParser
from app.parsers.docx import DocxDocumentParser
from app.parsers.pdf import PdfDocumentParser
from app.parsers.txt import TxtDocumentParser
from app.schemas.document import DocumentFileType


class DocumentParserFactory:
    """Factory ánh xạ loại file sang class parser tương ứng."""

    _parsers: dict[DocumentFileType, type[DocumentParser]] = {
        DocumentFileType.PDF: PdfDocumentParser,
        DocumentFileType.TXT: TxtDocumentParser,
        DocumentFileType.DOCX: DocxDocumentParser,
    }

    @classmethod
    def create(cls, file_type: DocumentFileType) -> DocumentParser:
        """Tạo parser stateless; loại ngoài MVP trả lỗi contract rõ ràng."""
        parser_class = cls._parsers.get(file_type)
        if parser_class is None:
            value = (
                file_type.value
                if isinstance(file_type, DocumentFileType)
                else str(file_type)
            )
            raise ServiceError(
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                "Không có parser cho loại học liệu",
                status_code=422,
                details=[ErrorDetail(field="file_type", message=value)],
            )

        return parser_class()