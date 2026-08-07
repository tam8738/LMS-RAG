package com.lmsrag.backend.dto.rag;

import com.lmsrag.backend.validation.ValidationPatterns;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO cho POST /api/v1/rag/answer.
 * <p>
 * FE gửi câu hỏi + danh sách document IDs đã được kiểm quyền;
 * Backend proxy sang AI Service /v1/answer-question.
 */
@Data
public class RagAnswerRequest {

    @NotEmpty(message = "Vui lòng chọn ít nhất một tài liệu")
    @Size(min = 1, max = 10, message = "Chỉ được chọn từ 1 đến 10 tài liệu")
    private List<
            @NotNull(message = "Document ID không được để trống")
            @Positive(message = "Document ID phải là số nguyên dương") Long> documentIds = new ArrayList<>();

    @NotBlank(message = "Câu hỏi không được để trống")
    @Size(max = 2000, message = "Câu hỏi tối đa 2000 ký tự")
    private String question;

    @NotNull(message = "top_k không được để trống")
    @Min(value = 1, message = "top_k phải từ 1 đến 8")
    @Max(value = 8, message = "top_k phải từ 1 đến 8")
    private Integer topK = 5;

    @NotBlank(message = "Ngôn ngữ không được để trống")
    @Pattern(regexp = ValidationPatterns.SUPPORTED_LANGUAGE,
            message = "Ngôn ngữ chỉ nhận vi hoặc en")
    private String language = "vi";

    @Size(max = 6, message = "Lịch sử hội thoại tối đa 6 tin nhắn")
    @Valid
    private List<RagChatMessage> history = new ArrayList<>();
}
