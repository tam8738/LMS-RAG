package com.lmsrag.backend.dto.rag;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO cho POST /api/v1/rag/answer.
 */
@Data
@Builder
public class RagAnswerResponse {

    private String answer;
    private Boolean notFound;

    @Builder.Default
    private List<RagCitation> citations = new ArrayList<>();

    private Integer tokensUsed;
}
