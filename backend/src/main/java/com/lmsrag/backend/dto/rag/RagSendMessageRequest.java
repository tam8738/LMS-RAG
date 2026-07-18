package com.lmsrag.backend.dto.rag;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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

    @Min(value = 3, message = "topK phải từ 3 đến 8")
    @Max(value = 8, message = "topK phải từ 3 đến 8")
    private Integer topK = 5;

    @Size(max = 2, message = "Ngôn ngữ không hợp lệ")
    private String language = "vi";
}
