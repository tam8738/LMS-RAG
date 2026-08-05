package com.lmsrag.backend.controller;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.rag.RagConversationResponse;
import com.lmsrag.backend.dto.rag.RagMessageResponse;
import com.lmsrag.backend.dto.rag.RagSendMessageRequest;
import com.lmsrag.backend.dto.rag.RagSendMessageResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.service.RagConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý RAG conversation history.
 * <p>
 * Backend là source of truth cho lịch sử hội thoại; AI Service vẫn stateless.
 */
@RestController
@RequestMapping("/api/v1/rag/conversations")
@RequiredArgsConstructor
@Tag(name = "RAG Conversation", description = "Lịch sử hội thoại RAG")
public class RagConversationController {

    private final RagConversationService ragConversationService;

    /**
     * Lấy hoặc tạo conversation theo document.
     */
    @Operation(summary = "Lấy hoặc tạo conversation theo document")
    @GetMapping("/by-document/{documentId}")
    public ResponseEntity<ApiResponse<RagConversationResponse>> getOrCreateConversation(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "ID của document")
            @PathVariable Long documentId) {

        User user = userDetails.getUser();
        RagConversationResponse response = ragConversationService.getOrCreateConversation(user, documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy conversation thành công"));
    }

    /**
     * GửI câu hỏi mới vào conversation.
     */
    @Operation(summary = "GửI câu hỏi mới vào conversation")
    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<ApiResponse<RagSendMessageResponse>> sendMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "ID của conversation")
            @PathVariable Long conversationId,
            @Valid @RequestBody RagSendMessageRequest request) {

        User user = userDetails.getUser();
        RagSendMessageResponse response = ragConversationService.sendMessage(user, conversationId, request);

        String message = Boolean.TRUE.equals(response.getAssistantMessage().getNotFound())
                ? "Không tìm thấy ngữ cảnh phù hợp"
                : "Trả lờI thành công";

        return ResponseEntity.ok(ApiResponse.success(response, message));
    }

    /**
     * Lấy danh sách message của conversation có phân trang.
     */
    @Operation(summary = "Lấy danh sách message của conversation")
    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<ApiResponse<Page<RagMessageResponse>>> getMessages(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "ID của conversation")
            @PathVariable Long conversationId,
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        User user = userDetails.getUser();
        Page<RagMessageResponse> response = ragConversationService.getMessages(user, conversationId, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách message thành công"));
    }

    /**
     * Xóa toàn bộ message trong conversation (clear history).
     */
    @Operation(summary = "Xóa lịch sử hội thoại")
    @DeleteMapping("/{conversationId}/messages")
    public ResponseEntity<ApiResponse<Void>> clearMessages(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Parameter(description = "ID của conversation")
            @PathVariable Long conversationId) {

        User user = userDetails.getUser();
        ragConversationService.clearMessages(user, conversationId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa lịch sử hội thoại"));
    }
}
