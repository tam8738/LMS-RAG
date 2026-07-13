package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiIndexDocumentResult {

    @JsonProperty("document_id")
    private Long documentId;

    @JsonProperty("status")
    private String status;

    @JsonProperty("page_count")
    private Integer pageCount;

    @JsonProperty("chunk_count")
    private Integer chunkCount;
}
