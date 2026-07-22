package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Request Backend gửi sang AI Service để sinh quiz draft. */
public record AiGenerateQuizRequest(
        @JsonProperty("document_ids") List<Long> documentIds,
        @JsonProperty("question_count") Integer questionCount,
        @JsonProperty("language") String language
) {
    public static AiGenerateQuizRequest from(Long documentId, Integer questionCount, String language) {
        return new AiGenerateQuizRequest(List.of(documentId), questionCount, language);
    }
}
