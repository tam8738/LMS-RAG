package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiIndexDocumentResult {

    @JsonProperty("document_id")
    private Long documentId;

    @JsonProperty("rag_status")
    private String ragStatus;

    @JsonProperty("page_count")
    private Integer pageCount;

    @JsonProperty("chunk_count")
    private Integer chunkCount;
}