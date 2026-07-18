package com.lmsrag.backend.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO cho GET /api/v1/rag/conversations/by-document/{documentId}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagConversationResponse {

    /** ID của conversation. */
    private Long conversationId;

    /** ID của document. */
    private Long documentId;

    /** Tiêu đề document/title conversation. */
    private String documentTitle;

    /** Số lượng message trong conversation. */
    private Integer messageCount;

    /** ThờI điểm message cuốI cùng. */
    private Instant lastMessageAt;

    /** Danh sách message trong conversation, sắp xếp thờI gian tăng dần. */
    @Builder.Default
    private List<RagMessageResponse> messages = new ArrayList<>();
}
