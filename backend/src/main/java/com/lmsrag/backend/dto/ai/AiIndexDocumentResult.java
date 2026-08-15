package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Kết quả lập chỉ mục tài liệu do AI Service trả về.
 */
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
