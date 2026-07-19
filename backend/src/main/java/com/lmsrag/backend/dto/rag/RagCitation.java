package com.lmsrag.backend.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Trích dẫn từ chunk thực tế trong document_chunks.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagCitation {

    private Long chunkId;
    private Long documentId;
    private Integer pageNumber;
    private Integer chunkIndex;
    private String excerpt;
    private Double score;
}
