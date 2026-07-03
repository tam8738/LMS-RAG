"""Abstraction chung cho mọi nhà cung cấp embedding."""

from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    """Dependency inversion: nghiệp vụ không phụ thuộc trực tiếp OpenAI SDK."""

    def __init__(self, model_name: str, dimensions: int) -> None:
        """Mọi provider phải công bố model và số chiều vector."""
        if not model_name:
            raise ValueError("model_name không được để trống")
        if dimensions <= 0:
            raise ValueError("dimensions phải lớn hơn 0")

        self.model_name = model_name
        self.dimensions = dimensions

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Trả một vector cho mỗi text và giữ nguyên thứ tự input."""
        raise NotImplementedError