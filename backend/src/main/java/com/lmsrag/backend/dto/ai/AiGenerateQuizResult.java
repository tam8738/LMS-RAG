package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Quiz draft AI Service trả về cho Backend. */
public record AiGenerateQuizResult(
        @JsonProperty("title") String title,
        @JsonProperty("description") String description,
        @JsonProperty("questions") List<AiQuizQuestion> questions,
        @JsonProperty("tokens_used") Integer tokensUsed
) {
}
