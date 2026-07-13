package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Data field trong response của AI Service /v1/answer-question.
 */
public record AiAnswerQuestionResult(
        String answer,
        @JsonProperty("not_found") Boolean notFound,
        List<AiAnswerCitation> citations,
        @JsonProperty("tokens_used") Integer tokensUsed
) {
}
