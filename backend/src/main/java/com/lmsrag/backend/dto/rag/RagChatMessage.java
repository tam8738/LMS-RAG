package com.lmsrag.backend.dto.rag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Tin nhắn trong lịch sử hội thoại RAG (stateless multi-turn).
 */
@Data
public class RagChatMessage {

    @NotBlank(message = "Role không được để trống")
    @Pattern(regexp = "^(user|assistant)$", message = "Role chỉ được là 'user' hoặc 'assistant'")
    private String role;

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Size(max = 2000, message = "Nội dung tin nhắn tối đa 2000 ký tự")
    private String content;
}
