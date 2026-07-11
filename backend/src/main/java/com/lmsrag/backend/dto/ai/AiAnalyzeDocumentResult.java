package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiAnalyzeDocumentResult {

    @JsonProperty("document_id")
    private Long documentId;

    private String status;

    @JsonProperty("rag_status")
    private String ragStatus;

    @JsonProperty("rag_supported")
    private Boolean ragSupported;

    @JsonProperty("page_count")
    private Integer pageCount;

    @JsonProperty("estimated_token_count")
    private Integer estimatedTokenCount;

    @JsonProperty("estimated_chunk_count")
    private Integer estimatedChunkCount;

    @JsonProperty("unsupported_reason")
    private String unsupportedReason;
}