"""Helpers for classifying user question intent."""

import unicodedata


_SUMMARY_INTENT_PHRASES = (
    "summary",
    "summarize",
    "summarise",
    "main point",
    "main idea",
    "key point",
    "key idea",
    "overview",
    "tom tat",
    "tong ket",
    "tong quan",
    "y chinh",
    "noi dung chinh",
    "diem chinh",
)


def is_summary_question(question: str) -> bool:
    """Return True when a question asks for a document summary or main ideas."""
    normalized_question = _normalize_text(question)
    return any(phrase in normalized_question for phrase in _SUMMARY_INTENT_PHRASES)


def _normalize_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )