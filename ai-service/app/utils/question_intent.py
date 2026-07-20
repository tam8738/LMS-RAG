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

_FOLLOW_UP_INTENT_PHRASES = (
    "noi chi tiet",
    "chi tiet hon",
    "giai thich them",
    "noi ro hon",
    "cu the hon",
    "phan do",
    "y do",
    "khai niem do",
    "dinh nghia do",
    "vi du ve no",
    "ve no",
    "them di",
    "more detail",
    "more details",
    "explain more",
    "tell me more",
    "elaborate",
    "be more specific",
    "that concept",
    "that definition",
    "about it",
)

_INSUFFICIENT_ANSWER_PHRASES = (
    "does not contain",
    "do not contain",
    "no relevant information",
    "not enough information",
    "insufficient information",
    "insufficient context",
    "khong chua thong tin",
    "khong chua du thong tin",
    "khong co thong tin",
    "khong cung cap thong tin",
    "khong cung cap du thong tin",
    "khong tim thay thong tin",
    "khong du thong tin",
    "khong chua du lieu",
)


def is_summary_question(question: str) -> bool:
    """Return True when a question asks for a document summary or main ideas."""
    normalized_question = _normalize_text(question)
    return any(phrase in normalized_question for phrase in _SUMMARY_INTENT_PHRASES)


def is_follow_up_question(question: str) -> bool:
    """Return True when a short question depends on the previous turn's topic."""
    normalized_question = _normalize_text(question)
    compact_question = " ".join(normalized_question.split())
    if any(phrase in compact_question for phrase in _FOLLOW_UP_INTENT_PHRASES):
        return True

    words = compact_question.split()
    if len(words) <= 5 and any(word in {"it", "that", "this", "do", "no"} for word in words):
        return True
    return False


def is_insufficient_answer(answer: str) -> bool:
    """Return True when the generated answer says the context has no answer."""
    normalized_answer = _normalize_text(answer)
    return any(phrase in normalized_answer for phrase in _INSUFFICIENT_ANSWER_PHRASES)


def _normalize_text(value: str) -> str:
    normalized_value = value.casefold().replace("đ", "d")
    decomposed = unicodedata.normalize("NFD", normalized_value)
    return "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )