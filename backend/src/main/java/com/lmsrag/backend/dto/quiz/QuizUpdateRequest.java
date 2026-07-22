package com.lmsrag.backend.dto.quiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** PATCH request cập nhật metadata và các câu hỏi hiện có của quiz draft. */
@Data
public class QuizUpdateRequest {

    @Size(max = 500, message = "Tiêu đề quiz tối đa 500 ký tự")
    @Pattern(regexp = "(?s).*\\S.*", message = "Tiêu đề quiz không được để trống")
    private String title;

    @Size(max = 5000, message = "Mô tả quiz tối đa 5000 ký tự")
    private String description;

    @Size(max = 10, message = "Quiz chỉ có tối đa 10 câu hỏi")
    @Valid
    private List<QuizQuestionUpdateRequest> questions;
}
