package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionRequest;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionResult;
import com.lmsrag.backend.dto.ai.AiChatMessage;
import com.lmsrag.backend.dto.rag.RagAnswerResponse;
import com.lmsrag.backend.dto.rag.RagCitation;
import com.lmsrag.backend.dto.rag.RagConversationResponse;
import com.lmsrag.backend.dto.rag.RagMessageResponse;
import com.lmsrag.backend.dto.rag.RagSendMessageRequest;
import com.lmsrag.backend.dto.rag.RagSendMessageResponse;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.RagConversation;
import com.lmsrag.backend.entity.RagMessage;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.enums.RagMessageRole;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.RagConversationRepository;
import com.lmsrag.backend.repository.RagMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service quản lý RAG conversation history.
 * <p>
 * Backend là source of truth cho lịch sử hội thoại. AI Service vẫn stateless,
 * chỉ nhận history qua từng request.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagConversationService {

    private static final int MAX_HISTORY_MESSAGES = 6;

    private final DocumentRepository documentRepository;
    private final RagConversationRepository ragConversationRepository;
    private final RagMessageRepository ragMessageRepository;
    private final AiServiceClient aiServiceClient;

    // =========================================================
    // ===== GET OR CREATE CONVERSATION =====
    // =========================================================

    /**
     * Lấy conversation theo user và document; nếu chưa có thì tạo mới.
     * Document phải tồn tại, đã PUBLISHED và đã PROCESSED.
     */
    @Transactional
    public RagConversationResponse getOrCreateConversation(User user, Long documentId) {
        log.info("[RAG_CONV] Lấy/tạo conversation | userId={} | documentId={}", user.getId(), documentId);

        Document document = requireDocumentForRag(documentId);

        RagConversation conversation = ragConversationRepository
                .findByUserIdAndDocumentId(user.getId(), documentId)
                .orElseGet(() -> createConversation(user, document));

        List<RagMessage> messages = ragMessageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversation.getId());

        return mapToConversationResponse(conversation, document, messages);
    }

    private RagConversation createConversation(User user, Document document) {
        log.info("[RAG_CONV] Tạo conversation mới | userId={} | documentId={}", user.getId(), document.getId());
        RagConversation conversation = RagConversation.builder()
                .user(user)
                .document(document)
                .title(document.getTitle())
                .messageCount(0)
                .build();
        return ragConversationRepository.save(conversation);
    }

    // =========================================================
    // ===== SEND MESSAGE =====
    // =========================================================

    /**
     * GửI câu hỏi mới vào conversation.
     * <p>
     * Flow: lưu user message → lấy history → gọI AI → lưu assistant message → trả response.
     */
    @Transactional
    public RagSendMessageResponse sendMessage(User user, Long conversationId, RagSendMessageRequest request) {
        log.info("[RAG_CONV] GửI message | userId={} | conversationId={} | question={}",
                user.getId(), conversationId, request.getQuestion());

        RagConversation conversation = requireConversation(conversationId, user);
        Document document = conversation.getDocument();
        validateDocumentForRag(document);

        // 1. Lưu user message
        RagMessage userMessage = RagMessage.builder()
                .conversation(conversation)
                .role(RagMessageRole.user)
                .content(request.getQuestion())
                .notFound(false)
                .tokensUsed(0)
                .build();
        userMessage = ragMessageRepository.save(userMessage);
        conversation.addMessage(userMessage);

        // 2. Lấy history (tối đa 6 messages) trước user message vừa lưu
        List<AiChatMessage> history = buildHistoryForAi(conversation.getId(), userMessage.getCreatedAt());

        // 3. GọI AI Service
        AiAnswerQuestionRequest aiRequest = new AiAnswerQuestionRequest(
                List.of(document.getId()),
                request.getQuestion(),
                request.getTopK(),
                request.getLanguage(),
                history
        );

        AiAnswerQuestionResult aiResult;
        try {
            aiResult = aiServiceClient.answerQuestionSync(aiRequest);
        } catch (Exception e) {
            log.error("[RAG_CONV] AI Service gọI thất bại | conversationId={} | error={}",
                    conversationId, e.getMessage(), e);
            throw new AppException(ErrorCode.AI_SERVICE_ERROR);
        }

        // 4. Lưu assistant message
        RagMessage assistantMessage = RagMessage.builder()
                .conversation(conversation)
                .role(RagMessageRole.assistant)
                .content(aiResult.answer())
                .notFound(Boolean.TRUE.equals(aiResult.notFound()))
                .citationsJson(mapAiCitations(aiResult.citations()))
                .tokensUsed(aiResult.tokensUsed() != null ? aiResult.tokensUsed() : 0)
                .build();
        assistantMessage = ragMessageRepository.save(assistantMessage);
        conversation.addMessage(assistantMessage);

        ragConversationRepository.save(conversation);

        return RagSendMessageResponse.builder()
                .conversationId(conversation.getId())
                .userMessage(mapToMessageResponse(userMessage))
                .assistantMessage(mapToMessageResponse(assistantMessage))
                .build();
    }

    // =========================================================
    // ===== GET MESSAGES =====
    // =========================================================

    /**
     * Lấy danh sách message của conversation có phân trang.
     */
    @Transactional(readOnly = true)
    public Page<RagMessageResponse> getMessages(User user, Long conversationId, Pageable pageable) {
        log.info("[RAG_CONV] Lấy messages | userId={} | conversationId={}", user.getId(), conversationId);

        RagConversation conversation = requireConversation(conversationId, user);
        return ragMessageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversation.getId(), pageable)
                .map(this::mapToMessageResponse);
    }

    // =========================================================
    // ===== CLEAR MESSAGES =====
    // =========================================================

    /**
     * Xóa toàn bộ message trong conversation (clear history).
     */
    @Transactional
    public void clearMessages(User user, Long conversationId) {
        log.info("[RAG_CONV] Xóa history | userId={} | conversationId={}", user.getId(), conversationId);

        RagConversation conversation = requireConversation(conversationId, user);
        ragMessageRepository.deleteByConversationId(conversation.getId());
        conversation.clearMessages();
        ragConversationRepository.save(conversation);
    }

    // =========================================================
    // ===== HELPERS =====
    // =========================================================

    private Document requireDocumentForRag(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
        validateDocumentForRag(document);
        return document;
    }

    private void validateDocumentForRag(Document document) {
        if (document.getPublicationStatus() != PublicationStatus.PUBLISHED) {
            log.warn("[RAG_CONV] Document chưa PUBLISHED | documentId={} | status={}",
                    document.getId(), document.getPublicationStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PUBLISHED);
        }
        if (document.getProcessingStatus() != AiProcessingStatus.PROCESSED) {
            log.warn("[RAG_CONV] Document chưa PROCESSED | documentId={} | processingStatus={}",
                    document.getId(), document.getProcessingStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PROCESSED);
        }
    }

    private RagConversation requireConversation(Long conversationId, User user) {
        RagConversation conversation = ragConversationRepository.findById(conversationId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.getUser().getId().equals(user.getId())) {
            log.warn("[RAG_CONV] Truy cập conversation không được phép | userId={} | conversationOwnerId={}",
                    user.getId(), conversation.getUser().getId());
            throw new AppException(ErrorCode.CONVERSATION_ACCESS_DENIED);
        }

        return conversation;
    }

    private List<AiChatMessage> buildHistoryForAi(Long conversationId, Instant before) {
        Pageable pageable = PageRequest.of(0, MAX_HISTORY_MESSAGES);
        List<RagMessage> recentMessages = ragMessageRepository
                .findRecentMessagesBefore(conversationId, before, pageable);

        if (recentMessages.isEmpty()) {
            return null;
        }

        List<RagMessage> orderedMessages = new ArrayList<>(recentMessages);
        Collections.reverse(orderedMessages); // cũ -> mới
        return orderedMessages.stream()
                .map(msg -> new AiChatMessage(
                        msg.getRole().name(),
                        msg.getContent()
                ))
                .toList();
    }

    private List<RagCitation> mapAiCitations(List<com.lmsrag.backend.dto.ai.AiAnswerCitation> aiCitations) {
        if (aiCitations == null || aiCitations.isEmpty()) {
            return Collections.emptyList();
        }
        return aiCitations.stream()
                .map(c -> RagCitation.builder()
                        .chunkId(c.chunkId())
                        .documentId(c.documentId())
                        .pageNumber(c.pageNumber())
                        .chunkIndex(c.chunkIndex())
                        .excerpt(c.excerpt())
                        .score(c.score())
                        .build())
                .toList();
    }

    private RagConversationResponse mapToConversationResponse(RagConversation conversation,
                                                              Document document,
                                                              List<RagMessage> messages) {
        return RagConversationResponse.builder()
                .conversationId(conversation.getId())
                .documentId(document.getId())
                .documentTitle(document.getTitle())
                .messageCount(conversation.getMessageCount())
                .lastMessageAt(conversation.getLastMessageAt())
                .messages(messages.stream()
                        .map(this::mapToMessageResponse)
                        .toList())
                .build();
    }

    private RagMessageResponse mapToMessageResponse(RagMessage message) {
        return RagMessageResponse.builder()
                .id(message.getId())
                .role(message.getRole().name())
                .content(message.getContent())
                .notFound(message.getNotFound())
                .citations(message.getCitationsJson() != null ? message.getCitationsJson() : Collections.emptyList())
                .tokensUsed(message.getTokensUsed())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
