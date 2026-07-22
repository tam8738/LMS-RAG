package com.lmsrag.backend.dto.quiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** PATCH data cho một câu hỏi đã thuộc quiz. */
@Data
public class QuizQuestionUpdateRequest {

    @NotNull(message = "Question ID không được để trống")
    private Long id;

    @Size(max = 1000, message = "Nội dung câu hỏi tối đa 1000 ký tự")
    @Pattern(regexp = "(?s).*\\S.*", message = "Nội dung câu hỏi không được để trống")
    private String question;

    @Pattern(regexp = "^single_choice$", message = "V1 chỉ hỗ trợ single_choice")
    private String type;

    @Size(min = 2, max = 4, message = "Câu hỏi phải có từ 2 đến 4 lựa chọn")
    @Valid
    private List<QuizOptionDto> options;

    @Size(min = 1, max = 1, message = "Câu hỏi single_choice phải có đúng một đáp án")
    private List<@Pattern(regexp = "^[A-D]$", message = "ID đáp án phải từ A đến D") String> correctOptionIds;

    @Size(max = 1200, message = "Giải thích tối đa 1200 ký tự")
    @Pattern(regexp = "(?s).*\\S.*", message = "Giải thích không được để trống")
    private String explanation;

}
