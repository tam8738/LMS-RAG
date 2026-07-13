package com.lmsrag.backend.dto.ai;

/**
 * Tin nhắn trong history gửi sang AI Service.
 */
public record AiChatMessage(
        String role,
        String content
) {
}
