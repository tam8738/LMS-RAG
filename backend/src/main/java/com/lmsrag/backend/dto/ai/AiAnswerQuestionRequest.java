package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Request Backend gửi sang AI Service POST /v1/answer-question.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiAnswerQuestionRequest(
        @JsonProperty("document_ids") List<Long> documentIds,
        String question,
        @JsonProperty("top_k") Integer topK,
        String language,
        List<AiChatMessage> history
) {
}
