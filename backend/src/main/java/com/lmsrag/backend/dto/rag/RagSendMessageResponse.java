package com.lmsrag.backend.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO cho POST /api/v1/rag/conversations/{conversationId}/messages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagSendMessageResponse {

    /** ID của conversation. */
    private Long conversationId;

    /** User message vừa gửi. */
    private RagMessageResponse userMessage;

    /** Assistant message vừa tạo. */
    private RagMessageResponse assistantMessage;
}
