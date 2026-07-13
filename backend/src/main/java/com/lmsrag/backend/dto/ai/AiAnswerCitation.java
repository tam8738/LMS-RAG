package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Citation trong response của AI Service /v1/answer-question.
 */
public record AiAnswerCitation(
        @JsonProperty("chunk_id") Long chunkId,
        @JsonProperty("document_id") Long documentId,
        @JsonProperty("page_number") Integer pageNumber,
        @JsonProperty("chunk_index") Integer chunkIndex,
        String excerpt,
        Double score
) {
}
