package com.lmsrag.backend.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Một lựa chọn trả lời của câu hỏi quiz. */
public record QuizOptionDto(
        @NotBlank(message = "ID lựa chọn không được để trống")
        @Pattern(regexp = "^[A-D]$", message = "ID lựa chọn phải từ A đến D")
        String id,

        @NotBlank(message = "Nội dung lựa chọn không được để trống")
        @Size(max = 500, message = "Nội dung lựa chọn tối đa 500 ký tự")
        String text
) {
}
