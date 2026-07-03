from abc import ABC, abstractmethod

from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.schemas.document import (
    DocumentFileType,
    ParsedDocument,
    ValidatedDocument,
)


class DocumentParser(ABC):
    supported_type: DocumentFileType

    def parse(self, document: ValidatedDocument) -> ParsedDocument:
        if document.file_type is not self.supported_type:
            raise ServiceError(
                ErrorCode.INVALID_INPUT,
                "Parser không phù hợp với loại học liệu",
                status_code=422,
                details=[
                    ErrorDetail(
                        field="file_type",
                        message=(
                            f"Parser {self.supported_type.value} không thể đọc "
                            f"file {document.file_type.value}"
                        ),
                    )
                ],
            )

        return self._parse(document)

    @abstractmethod
    def _parse(self, document: ValidatedDocument) -> ParsedDocument:
        raise NotImplementedError