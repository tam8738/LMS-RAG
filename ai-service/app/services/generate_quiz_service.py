"""Điều phối use case sinh quiz draft từ chunks đã được index.

Backend kiểm quyền/trạng thái và lưu/publish quiz. Repository chỉ lấy context
trong ``document_ids`` đã được cho phép. Provider yêu cầu LLM trả JSON rồi map
citation về chunk thật. AI Service không lưu quiz, không tạo public link và
không chấm điểm.
"""

from app.core.errors import ErrorCode, ErrorDetail, ServiceError
from app.generation.base import GenerationProvider
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.schemas.generate_quiz import GenerateQuizRequest, GenerateQuizResult


class GenerateQuizService:
    """Tạo quiz draft có cấu trúc để Teacher review trước khi publish."""

    def __init__(
        self,
        chunk_repository: DocumentChunkRepository,
        generation_provider: GenerationProvider,
    ) -> None:
        self.chunk_repository = chunk_repository
        self.generation_provider = generation_provider

    def generate(self, request: GenerateQuizRequest) -> GenerateQuizResult:
        """Lấy context đại diện rồi yêu cầu provider sinh quiz grounded."""
        # Khác RAG answer (tìm theo câu hỏi), quiz cần phủ đều tài liệu. Vì vậy
        # repository dùng NTILE để lấy chunks rải từ đầu tới cuối document.
        chunks = self.chunk_repository.get_document_chunks(
            request.document_ids,
            request.max_context_chunks,
        )
        if not chunks:
            # Trạng thái document có thể lệch DB; không gọi LLM với context rỗng.
            raise ServiceError(
                ErrorCode.NO_CHUNKS_FOUND,
                "Khong tim thay chunks de sinh quiz tu tai lieu da chon",
                status_code=404,
                details=[
                    ErrorDetail(
                        field="document_ids",
                        message=",".join(str(document_id) for document_id in request.document_ids),
                    )
                ],
            )

        # Provider lo prompt, parse/validate JSON và map source_chunk_ids về
        # citations thật; application service chỉ điều phối các dependency.
        generated = self.generation_provider.generate_quiz(
            document_ids=request.document_ids,
            question_count=request.question_count,
            language=request.language,
            chunks=chunks,
        )
        return generated.quiz