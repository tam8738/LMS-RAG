"""Wrapper nhỏ quanh tiktoken để toàn pipeline dùng cùng cách đếm token."""

import tiktoken
from tiktoken import Encoding

from app.core.config import settings


class Tokenizer:
    """Encode/decode/count token theo embedding model đã cấu hình."""

    def __init__(
        self,
        model_name: str | None = None,
        encoding_name: str | None = None,
    ) -> None:
        """Chọn encoding theo tên trực tiếp hoặc theo model OpenAI.

        ``encoding_name`` hữu ích trong test. Nếu tiktoken chưa biết một model
        mới, ``cl100k_base`` là fallback ổn định cho pipeline hiện tại.
        """
        if encoding_name is not None:
            self.encoding = tiktoken.get_encoding(encoding_name)
            return

        selected_model = model_name or settings.embedding_model
        try:
            self.encoding = tiktoken.encoding_for_model(selected_model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")

    encoding: Encoding

    def encode(self, text: str) -> list[int]:
        """Chuyển text thành token IDs.

        ``disallowed_special=()`` coi chuỗi giống special token trong tài liệu
        là text bình thường thay vì phát sinh exception.
        """
        return self.encoding.encode(text, disallowed_special=())

    def decode(self, tokens: list[int]) -> str:
        """Chuyển một dãy token IDs trở lại text."""
        return self.encoding.decode(tokens)

    def count(self, text: str) -> int:
        """Đếm token thực tế thay vì đếm ký tự hoặc từ."""
        return len(self.encode(text))