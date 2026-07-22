package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Citation thật được AI Service map từ document chunk. */
public record AiQuizCitation(
        @JsonProperty("chunk_id") Long chunkId,
        @JsonProperty("document_id") Long documentId,
        @JsonProperty("page_number") Integer pageNumber,
        @JsonProperty("chunk_index") Integer chunkIndex,
        @JsonProperty("excerpt") String excerpt
) {
}
