package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Một câu hỏi trong quiz draft do AI Service sinh. */
public record AiQuizQuestion(
        @JsonProperty("question") String question,
        @JsonProperty("type") String type,
        @JsonProperty("options") List<AiQuizOption> options,
        @JsonProperty("correct_option_ids") List<String> correctOptionIds,
        @JsonProperty("explanation") String explanation,
        @JsonProperty("citations") List<AiQuizCitation> citations
) {
}
