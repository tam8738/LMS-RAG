import tiktoken
from tiktoken import Encoding

from app.core.config import settings


class Tokenizer:
    def __init__(
        self,
        model_name: str | None = None,
        encoding_name: str | None = None,
    ) -> None:
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
        return self.encoding.encode(text, disallowed_special=())

    def decode(self, tokens: list[int]) -> str:
        return self.encoding.decode(tokens)

    def count(self, text: str) -> int:
        return len(self.encode(text))