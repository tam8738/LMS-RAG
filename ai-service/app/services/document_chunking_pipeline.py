"""Điều phối parse -> clean -> chunk cho một ValidatedDocument."""

from app.core.errors import ErrorCode, ServiceError
from app.parsers.factory import DocumentParserFactory
from app.schemas.document import ChunkedDocument, ValidatedDocument
from app.services.text_chunker import TextChunker
from app.services.text_cleaner import TextCleaner


class DocumentChunkingPipeline:
    """Nối các component nhỏ mà không trộn logic của chúng vào một class."""

    def __init__(
        self,
        cleaner: TextCleaner | None = None,
        chunker: TextChunker | None = None,
    ) -> None:
        """Cho phép inject cleaner/chunker giả trong unit test."""
        self.cleaner = cleaner or TextCleaner()
        self.chunker = chunker or TextChunker()

    def run(self, document: ValidatedDocument) -> ChunkedDocument:
        """Parse file rồi tạo chunks riêng theo từng trang.

        Chunk riêng từng trang giúp citation luôn có một ``page_number`` rõ
        ràng. Đổi lại, cuối mỗi trang có thể có chunk ngắn hơn chunk_size.
        """
        parser = DocumentParserFactory.create(document.file_type)
        parsed_document = parser.parse(document)
        chunks = []

        for page in parsed_document.pages:
            cleaned_content = self.cleaner.clean(page.content)
            if not cleaned_content:
                continue

            page_chunks = self.chunker.chunk(
                cleaned_content,
                page_number=page.page_number,
                # Số chunks đã có chính là index bắt đầu của trang hiện tại.
                start_index=len(chunks),
            )
            chunks.extend(page_chunks)

        if not chunks:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không tạo được chunk từ học liệu sau khi làm sạch",
                status_code=422,
            )

        return ChunkedDocument(
            file_type=parsed_document.file_type,
            page_count=parsed_document.page_count,
            chunks=chunks,
        )