package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Kết quả phân tích tài liệu do AI Service trả về.
 */
@Data
public class AiAnalyzeDocumentResult {

    @JsonProperty("document_id")
    private Long documentId;

    @JsonProperty("can_rag")
    private Boolean canRag;

    @JsonProperty("rag_status")
    private String ragStatus;

    @JsonProperty("page_count")
    private Integer pageCount;

    @JsonProperty("estimated_token_count")
    private Integer estimatedTokenCount;

    @JsonProperty("estimated_chunk_count")
    private Integer estimatedChunkCount;

    @JsonProperty("unsupported_reason")
    private String unsupportedReason;
}
