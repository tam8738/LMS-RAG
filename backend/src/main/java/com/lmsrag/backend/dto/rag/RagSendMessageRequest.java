package com.lmsrag.backend.dto.rag;

import com.lmsrag.backend.validation.ValidationPatterns;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO cho POST /api/v1/rag/conversations/{conversationId}/messages.
 */
@Data
public class RagSendMessageRequest {

    @NotBlank(message = "Câu hỏi không được để trống")
    @Size(max = 2000, message = "Câu hỏi tối đa 2000 ký tự")
    private String question;

    @NotNull(message = "topK không được để trống")
    @Min(value = 3, message = "topK phải từ 3 đến 8")
    @Max(value = 8, message = "topK phải từ 3 đến 8")
    private Integer topK = 5;

    @NotBlank(message = "Ngôn ngữ không được để trống")
    @Pattern(regexp = ValidationPatterns.SUPPORTED_LANGUAGE,
            message = "Ngôn ngữ chỉ nhận vi hoặc en")
    private String language = "vi";
}
