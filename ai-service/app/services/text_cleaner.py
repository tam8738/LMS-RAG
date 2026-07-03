import re

_CONTROL_CHARACTERS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HORIZONTAL_WHITESPACE = re.compile(r"[^\S\r\n]+")
_FENCE_MARKERS = ("```", "~~~")


class TextCleaner:
    def clean(self, text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = _CONTROL_CHARACTERS.sub("", normalized)

        cleaned_lines: list[str] = []
        inside_fence = False
        for raw_line in normalized.split("\n"):
            stripped_line = raw_line.strip()
            is_fence = stripped_line.startswith(_FENCE_MARKERS)
            is_indented_code = raw_line.startswith(("    ", "\t"))

            if inside_fence or is_fence or is_indented_code:
                cleaned_line = raw_line.rstrip()
            else:
                cleaned_line = _HORIZONTAL_WHITESPACE.sub(" ", raw_line).strip()

            if cleaned_line:
                cleaned_lines.append(cleaned_line)
            elif cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")

            if is_fence:
                inside_fence = not inside_fence

        while cleaned_lines and cleaned_lines[-1] == "":
            cleaned_lines.pop()

        return "\n".join(cleaned_lines)