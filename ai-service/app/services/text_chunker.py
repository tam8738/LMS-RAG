"""Chia text theo token với overlap và ưu tiên boundary có ngữ nghĩa."""

import re

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError
from app.schemas.document import DocumentChunk
from app.services.tokenizer import Tokenizer

# Thứ tự chính là mức ưu tiên khi tìm điểm cắt: paragraph tốt hơn sentence,
# sentence tốt hơn newline/whitespace. Không có boundary thì cắt cứng theo token.
_BOUNDARY_PATTERNS = (
    re.compile(r"\n[ \t]*\n+"),
    re.compile(r"[.!?][\"')\]]*\s+"),
    re.compile(r"\n"),
    re.compile(r"\s+"),
)


class TextChunker:
    """Biến text của một trang thành các chunks không vượt token limit."""

    def __init__(
        self,
        tokenizer: Tokenizer | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> None:
        """Nhận dependency tùy chọn để test thuật toán bằng tokenizer xác định."""
        self.tokenizer = tokenizer or Tokenizer()
        self.chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
        self.chunk_overlap = (
            chunk_overlap
            if chunk_overlap is not None
            else settings.chunk_overlap
        )
        self._validate_configuration()

    def chunk(
        self,
        text: str,
        *,
        page_number: int | None,
        start_index: int = 0,
    ) -> list[DocumentChunk]:
        """Chia text và gắn page number cùng global chunk index.

        ``start_index`` do pipeline truyền vào để trang sau tiếp tục index của
        trang trước, thay vì mỗi trang đều bắt đầu lại từ 0.
        """
        normalized_text = text.strip()
        if not normalized_text:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không có nội dung để chia chunk",
                status_code=422,
            )

        # Encode một lần, sau đó di chuyển cửa sổ trên danh sách token.
        tokens = self.tokenizer.encode(normalized_text)
        chunks: list[DocumentChunk] = []
        start = 0

        while start < len(tokens):
            target_end = min(start + self.chunk_size, len(tokens))
            end = target_end

            # Chunk cuối lấy toàn bộ phần còn lại; các chunk trước thử lùi về
            # boundary tốt hơn để không cắt giữa paragraph/câu.
            if target_end < len(tokens):
                end = self._find_preferred_end(tokens, start, target_end)

            content = self.tokenizer.decode(tokens[start:end]).strip()
            if not content:
                # Boundary có thể chỉ chứa whitespace. Khi đó quay về hard cut
                # để vòng lặp vẫn tiến lên và không tạo chunk rỗng.
                end = target_end
                content = self.tokenizer.decode(tokens[start:end]).strip()

            if content:
                chunks.append(
                    DocumentChunk(
                        page_number=page_number,
                        chunk_index=start_index + len(chunks),
                        content=content,
                        token_count=self.tokenizer.count(content),
                    )
                )

            if end >= len(tokens):
                break

            # Lùi lại chunk_overlap token để chunk sau giữ một phần ngữ cảnh
            # của chunk trước. start + 1 là hàng rào chống vòng lặp vô hạn.
            start = max(end - self.chunk_overlap, start + 1)

        if not chunks:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không tạo được chunk từ nội dung học liệu",
                status_code=422,
            )

        return chunks

    def _find_preferred_end(
        self,
        tokens: list[int],
        start: int,
        target_end: int,
    ) -> int:
        """Tìm boundary tốt nhất trong nửa sau của cửa sổ token.

        Chỉ tìm trong nửa sau để tránh chunk quá ngắn. Boundary cũng phải dài
        hơn overlap; nếu không, vị trí start mới có thể không tiến đủ xa.
        """
        candidate_tokens = tokens[start:target_end]
        candidate_text = self.tokenizer.decode(candidate_tokens)
        minimum_position = len(candidate_text) // 2

        for pattern in _BOUNDARY_PATTERNS:
            positions = [
                match.end()
                for match in pattern.finditer(candidate_text)
                if match.end() >= minimum_position
            ]
            if not positions:
                continue

            # Regex trả vị trí ký tự, nên phải encode prefix để đổi lại số token.
            boundary_token_count = len(
                self.tokenizer.encode(candidate_text[: positions[-1]])
            )
            if self.chunk_overlap < boundary_token_count < len(candidate_tokens):
                return start + boundary_token_count

        return target_end

    def _validate_configuration(self) -> None:
        """Fail fast với cấu hình có thể tạo chunk sai hoặc vòng lặp vô hạn."""
        if self.chunk_size <= 0:
            raise ValueError("chunk_size phải lớn hơn 0")
        if self.chunk_overlap < 0:
            raise ValueError("chunk_overlap không được âm")
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap phải nhỏ hơn chunk_size")