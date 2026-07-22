package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Một lựa chọn trả lời do AI Service sinh. */
public record AiQuizOption(
        @JsonProperty("id") String id,
        @JsonProperty("text") String text
) {
}
