import re

from app.core.config import settings
from app.core.errors import ErrorCode, ServiceError
from app.schemas.document import DocumentChunk
from app.services.tokenizer import Tokenizer

_BOUNDARY_PATTERNS = (
    re.compile(r"\n[ \t]*\n+"),
    re.compile(r"[.!?][\"')\]]*\s+"),
    re.compile(r"\n"),
    re.compile(r"\s+"),
)


class TextChunker:
    def __init__(
        self,
        tokenizer: Tokenizer | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> None:
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
        normalized_text = text.strip()
        if not normalized_text:
            raise ServiceError(
                ErrorCode.EMPTY_DOCUMENT,
                "Không có nội dung để chia chunk",
                status_code=422,
            )

        tokens = self.tokenizer.encode(normalized_text)
        chunks: list[DocumentChunk] = []
        start = 0

        while start < len(tokens):
            target_end = min(start + self.chunk_size, len(tokens))
            end = target_end
            if target_end < len(tokens):
                end = self._find_preferred_end(tokens, start, target_end)

            content = self.tokenizer.decode(tokens[start:end]).strip()
            if not content:
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

            boundary_token_count = len(
                self.tokenizer.encode(candidate_text[: positions[-1]])
            )
            if self.chunk_overlap < boundary_token_count < len(candidate_tokens):
                return start + boundary_token_count

        return target_end

    def _validate_configuration(self) -> None:
        if self.chunk_size <= 0:
            raise ValueError("chunk_size phải lớn hơn 0")
        if self.chunk_overlap < 0:
            raise ValueError("chunk_overlap không được âm")
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap phải nhỏ hơn chunk_size")