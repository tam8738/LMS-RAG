package com.lmsrag.backend.dto.quiz;

import com.lmsrag.backend.validation.ValidationPatterns;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** Request Teacher gửi để sinh quiz từ một document. */
@Data
public class QuizGenerateRequest {

    @NotNull(message = "Document ID không được để trống")
    @Positive(message = "Document ID phải là số nguyên dương")
    private Long documentId;

    @NotNull(message = "Số câu hỏi không được để trống")
    @Min(value = 1, message = "Số câu hỏi phải từ 1 đến 20")
    @Max(value = 20, message = "Số câu hỏi phải từ 1 đến 20")
    private Integer questionCount = 5;

    @NotBlank(message = "Ngôn ngữ không được để trống")
    @Pattern(regexp = ValidationPatterns.SUPPORTED_LANGUAGE,
            message = "Ngôn ngữ chỉ nhận vi hoặc en")
    private String language = "vi";
}
