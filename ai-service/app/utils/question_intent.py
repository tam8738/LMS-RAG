"""Heuristic nhẹ để nhận diện summary, follow-up và insufficient answer.

Đây không phải mô hình ML. Text được lowercase, đổi ``đ`` thành ``d`` và bỏ
dấu Unicode rồi so phrase. Cách này nhanh/deterministic cho MVP và hỗ trợ câu
tiếng Việt có hoặc không dấu.
"""

import re
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
    """Nhận diện yêu cầu tóm tắt để tăng top_k và output token budget."""
    normalized_question = _normalize_text(question)
    if any(phrase in normalized_question for phrase in _SUMMARY_INTENT_PHRASES):
        return True

    # "Chương 3 nói về điều gì?" là yêu cầu overview dù không có từ "tóm tắt",
    # vì vậy vẫn cấp output budget rộng như các câu hỏi summary khác.
    return extract_chapter_number(question) is not None and any(
        phrase in normalized_question
        for phrase in ("noi ve dieu gi", "noi ve gi", "what is chapter", "chapter about")
    )


def extract_chapter_number(question: str) -> int | None:
    """Trả số chương dương được nhắc rõ bằng chữ số, hỗ trợ Việt/Anh."""
    normalized_question = _normalize_text(question)
    match = re.search(r"\b(?:chuong|chapter)\s+(\d{1,3})\b", normalized_question)
    if match is None:
        return None

    chapter_number = int(match.group(1))
    return chapter_number if chapter_number > 0 else None


def is_follow_up_question(question: str) -> bool:
    """Nhận diện câu ngắn phụ thuộc chủ đề lượt trước.

    Kết quả quyết định có nối history vào retrieval query hay không."""
    normalized_question = _normalize_text(question)
    compact_question = " ".join(normalized_question.split())
    if any(phrase in compact_question for phrase in _FOLLOW_UP_INTENT_PHRASES):
        return True

    words = compact_question.split()
    if len(words) <= 5 and any(word in {"it", "that", "this", "do", "no"} for word in words):
        return True
    return False


def is_insufficient_answer(answer: str) -> bool:
    """Nhận diện khi LLM nói context không đủ.

    Service dùng kết quả để trả ``not_found=true`` và bỏ citations."""
    normalized_answer = _normalize_text(answer)
    return any(phrase in normalized_answer for phrase in _INSUFFICIENT_ANSWER_PHRASES)


def _normalize_text(value: str) -> str:
    """Casefold và bỏ dấu để phrase matching không phụ thuộc cách gõ."""
    normalized_value = value.casefold().replace("đ", "d")
    decomposed = unicodedata.normalize("NFD", normalized_value)
    return "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )