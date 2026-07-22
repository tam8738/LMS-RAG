package com.lmsrag.backend.dto.quiz;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Request Teacher gửi để sinh quiz từ một document. */
@Data
public class QuizGenerateRequest {

    @NotNull(message = "Document ID không được để trống")
    private Long documentId;

    @NotNull(message = "Số câu hỏi không được để trống")
    @Min(value = 1, message = "Số câu hỏi phải từ 1 đến 10")
    @Max(value = 10, message = "Số câu hỏi phải từ 1 đến 10")
    private Integer questionCount = 5;

    @NotNull(message = "Ngôn ngữ không được để trống")
    @Pattern(regexp = "^(vi|en)$", message = "Ngôn ngữ chỉ nhận vi hoặc en")
    private String language = "vi";
}
