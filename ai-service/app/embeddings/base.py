from abc import ABC, abstractmethod


class EmbeddingProvider(ABC):
    def __init__(self, model_name: str, dimensions: int) -> None:
        if not model_name:
            raise ValueError("model_name không được để trống")
        if dimensions <= 0:
            raise ValueError("dimensions phải lớn hơn 0")

        self.model_name = model_name
        self.dimensions = dimensions

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError