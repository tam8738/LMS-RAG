package com.lmsrag.backend.dto.rag;

import lombok.Builder;
import lombok.Data;

/**
 * Trích dẫn từ chunk thực tế trong document_chunks.
 */
@Data
@Builder
public class RagCitation {

    private Long chunkId;
    private Long documentId;
    private Integer pageNumber;
    private Integer chunkIndex;
    private String excerpt;
    private Double score;
}
