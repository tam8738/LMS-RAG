"""Chuẩn hóa text mà không thay đổi ý nghĩa học liệu."""

import re

# Xóa control characters không hiển thị, nhưng cố ý giữ tab và newline.
_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HORIZONTAL_WHITESPACE = re.compile(r"[^\S\r\n]+")
_FENCE_MARKERS = ("```", "~~~")


class TextCleaner:
    """Làm sạch prose đồng thời bảo toàn spacing có ý nghĩa trong code."""

    def clean(self, text: str) -> str:
        """Chuẩn hóa line ending, whitespace và số dòng trống liên tiếp.

        Hàm không dịch, tóm tắt hoặc viết lại nội dung. Code block và dòng
        thụt đầu dòng được giữ spacing để không làm sai indentation/công thức.
        """
        # Windows dùng CRLF, một số file cũ dùng CR; pipeline thống nhất LF.
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = _CONTROL_CHARACTERS.sub("", normalized)

        cleaned_lines: list[str] = []
        inside_fence = False
        for raw_line in normalized.split("\n"):
            stripped_line = raw_line.strip()
            is_fence = stripped_line.startswith(_FENCE_MARKERS)
            is_indented_code = raw_line.startswith(("    ", "\t"))

            if inside_fence or is_fence or is_indented_code:
                # Chỉ bỏ whitespace cuối dòng; giữ spacing/indentation bên trong.
                cleaned_line = raw_line.rstrip()
            else:
                # Prose không cần nhiều space/tab liên tiếp.
                cleaned_line = _HORIZONTAL_WHITESPACE.sub(" ", raw_line).strip()

            if cleaned_line:
                cleaned_lines.append(cleaned_line)
            elif cleaned_lines and cleaned_lines[-1] != "":
                # Chỉ giữ một dòng rỗng để biểu diễn paragraph boundary.
                cleaned_lines.append("")

            # Marker mở và đóng giống nhau nên mỗi lần gặp marker ta đảo trạng thái.
            if is_fence:
                inside_fence = not inside_fence

        # Không để newline/paragraph rỗng ở cuối tài liệu.
        while cleaned_lines and cleaned_lines[-1] == "":
            cleaned_lines.pop()

        return "\n".join(cleaned_lines)