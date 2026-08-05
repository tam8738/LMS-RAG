package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.dto.ai.AiAnswerCitation;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionRequest;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionResult;
import com.lmsrag.backend.dto.ai.AiChatMessage;
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
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.RagConversationRepository;
import com.lmsrag.backend.repository.RagMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagConversationServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private RagConversationRepository ragConversationRepository;

    @Mock
    private RagMessageRepository ragMessageRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private AiRequestGuard aiRequestGuard;

    @InjectMocks
    private RagConversationService ragConversationService;

    private User teacher;
    private User otherTeacher;
    private Document publishedDocument;
    private Document unprocessedDocument;
    private Document unpublishedDocument;
    private RagConversation conversation;
    private RagMessage oldUserMessage;
    private RagMessage oldAssistantMessage;
    private AtomicBoolean transactionTemplateActive;

    @BeforeEach
    void setUp() {
        transactionTemplateActive = new AtomicBoolean(false);
        lenient().when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            assertThat(transactionTemplateActive.compareAndSet(false, true)).isTrue();
            try {
                return callback.doInTransaction(null);
            } finally {
                transactionTemplateActive.set(false);
            }
        });
        lenient().when(aiRequestGuard.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<?> action = invocation.getArgument(2);
            return action.get();
        });

        teacher = createUser(1L, "teacher.a@example.com", UserRole.TEACHER);
        otherTeacher = createUser(2L, "teacher.b@example.com", UserRole.TEACHER);

        publishedDocument = createDocument(10L, "Cơ sở dữ liệu", PublicationStatus.PUBLISHED, AiProcessingStatus.PROCESSED);
        unprocessedDocument = createDocument(11L, "Chưa xử lý", PublicationStatus.PUBLISHED, AiProcessingStatus.ANALYZED);
        unpublishedDocument = createDocument(12L, "Chưa publish", PublicationStatus.DRAFT, AiProcessingStatus.PROCESSED);

        conversation = RagConversation.builder()
                .id(100L)
                .user(teacher)
                .document(publishedDocument)
                .title(publishedDocument.getTitle())
                .messageCount(2)
                .lastMessageAt(Instant.now())
                .messages(new ArrayList<>())
                .build();

        oldUserMessage = createMessage(1L, conversation, RagMessageRole.user, "Chuẩn hóa dữ liệu là gì?", false, 0);
        oldAssistantMessage = createMessage(2L, conversation, RagMessageRole.assistant, "Chuẩn hóa là quá trình...", false, 100);
        conversation.addMessage(oldUserMessage);
        conversation.addMessage(oldAssistantMessage);
    }

    // =========================================================
    // ===== GET OR CREATE CONVERSATION =====
    // =========================================================

    @Test
    void getOrCreateConversation_whenConversationExists_shouldReturnOnlyBoundedRecentMessages() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(publishedDocument));
        when(ragConversationRepository.findByUserIdAndDocumentId(1L, 10L)).thenReturn(Optional.of(conversation));
        Pageable recentPageable = PageRequest.of(0, 30);
        when(ragMessageRepository.findByConversationIdOrderByCreatedAtDescIdDesc(100L, recentPageable))
                .thenReturn(new PageImpl<>(List.of(oldAssistantMessage, oldUserMessage), recentPageable, 2));

        RagConversationResponse response = ragConversationService.getOrCreateConversation(teacher, 10L);

        assertThat(response.getConversationId()).isEqualTo(100L);
        assertThat(response.getDocumentId()).isEqualTo(10L);
        assertThat(response.getDocumentTitle()).isEqualTo("Cơ sở dữ liệu");
        assertThat(response.getMessageCount()).isEqualTo(2);
        assertThat(response.getMessages()).hasSize(2);
        assertThat(response.getMessages().get(0).getRole()).isEqualTo("user");
        assertThat(response.getMessages().get(1).getRole()).isEqualTo("assistant");

        verify(ragConversationRepository, never()).save(any());
    }

    @Test
    void getOrCreateConversation_whenConversationNotExists_shouldCreateNewConversation() {
        when(documentRepository.findById(10L)).thenReturn(Optional.of(publishedDocument));
        when(ragConversationRepository.findByUserIdAndDocumentId(1L, 10L)).thenReturn(Optional.empty());
        when(ragConversationRepository.save(any(RagConversation.class))).thenAnswer(invocation -> {
            RagConversation saved = invocation.getArgument(0);
            saved.setId(101L);
            return saved;
        });
        RagConversationResponse response = ragConversationService.getOrCreateConversation(teacher, 10L);

        assertThat(response.getConversationId()).isEqualTo(101L);
        assertThat(response.getDocumentId()).isEqualTo(10L);
        assertThat(response.getMessages()).isEmpty();
        assertThat(response.getMessageCount()).isEqualTo(0);

        ArgumentCaptor<RagConversation> captor = ArgumentCaptor.forClass(RagConversation.class);
        verify(ragConversationRepository).save(captor.capture());
        RagConversation saved = captor.getValue();
        assertThat(saved.getUser().getId()).isEqualTo(1L);
        assertThat(saved.getDocument().getId()).isEqualTo(10L);
        assertThat(saved.getTitle()).isEqualTo("Cơ sở dữ liệu");
    }

    @Test
    void getOrCreateConversation_whenDocumentNotFound_shouldThrowDocumentNotFound() {
        when(documentRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ragConversationService.getOrCreateConversation(teacher, 99L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_NOT_FOUND));
    }

    @Test
    void getOrCreateConversation_whenDocumentNotPublished_shouldThrowDocumentNotPublished() {
        when(documentRepository.findById(12L)).thenReturn(Optional.of(unpublishedDocument));

        assertThatThrownBy(() -> ragConversationService.getOrCreateConversation(teacher, 12L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_NOT_PUBLISHED));
    }

    @Test
    void getOrCreateConversation_whenDocumentNotProcessed_shouldThrowDocumentNotProcessed() {
        when(documentRepository.findById(11L)).thenReturn(Optional.of(unprocessedDocument));

        assertThatThrownBy(() -> ragConversationService.getOrCreateConversation(teacher, 11L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_NOT_PROCESSED));
    }

    // =========================================================
    // ===== SEND MESSAGE =====
    // =========================================================

    @Test
    void sendMessage_shouldSaveUserAndAssistantMessagesAndReturnResponse() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Có mấy dạng chuẩn hóa?");
        request.setTopK(5);
        request.setLanguage("vi");

        RagMessage savedUserMessage = createMessage(3L, conversation, RagMessageRole.user, "Có mấy dạng chuẩn hóa?", false, 0);
        RagMessage savedAssistantMessage = RagMessage.builder()
                .id(4L)
                .conversation(conversation)
                .role(RagMessageRole.assistant)
                .content("Có 3 dạng chuẩn hóa chính...")
                .notFound(false)
                .tokensUsed(150)
                .citationsJson(List.of(
                        com.lmsrag.backend.dto.rag.RagCitation.builder()
                                .chunkId(20L)
                                .documentId(10L)
                                .pageNumber(5)
                                .chunkIndex(7)
                                .excerpt("Có 3 dạng...")
                                .score(0.82)
                                .build()
                ))
                .build();
        savedAssistantMessage.setCreatedAt(Instant.now());

        AiAnswerQuestionResult aiResult = new AiAnswerQuestionResult(
                "Có 3 dạng chuẩn hóa chính...",
                false,
                List.of(new AiAnswerCitation(20L, 10L, 5, 7, "Có 3 dạng...", 0.82)),
                150
        );

        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));
        when(ragMessageRepository.save(any(RagMessage.class)))
                .thenAnswer(invocation -> {
                    RagMessage msg = invocation.getArgument(0);
                    return msg.getRole() == RagMessageRole.user ? savedUserMessage : savedAssistantMessage;
                });
        when(ragMessageRepository.findRecentMessagesBefore(eq(100L), any(Instant.class), eq(PageRequest.of(0, 6))))
                .thenReturn(List.of(oldAssistantMessage, oldUserMessage)); // DESC order
        when(aiServiceClient.answerQuestionSync(any(AiAnswerQuestionRequest.class))).thenAnswer(invocation -> {
            assertThat(transactionTemplateActive).isFalse();
            return aiResult;
        });
        when(ragConversationRepository.save(any(RagConversation.class))).thenReturn(conversation);

        RagSendMessageResponse response = ragConversationService.sendMessage(teacher, 100L, request);

        assertThat(response.getConversationId()).isEqualTo(100L);
        assertThat(response.getUserMessage().getContent()).isEqualTo("Có mấy dạng chuẩn hóa?");
        assertThat(response.getAssistantMessage().getContent()).isEqualTo("Có 3 dạng chuẩn hóa chính...");
        assertThat(response.getAssistantMessage().getNotFound()).isFalse();
        assertThat(response.getAssistantMessage().getCitations()).hasSize(1);
        assertThat(response.getAssistantMessage().getTokensUsed()).isEqualTo(150);

        // Verify AI called with correct document and history
        ArgumentCaptor<AiAnswerQuestionRequest> aiCaptor = ArgumentCaptor.forClass(AiAnswerQuestionRequest.class);
        verify(aiServiceClient).answerQuestionSync(aiCaptor.capture());
        AiAnswerQuestionRequest aiRequest = aiCaptor.getValue();
        assertThat(aiRequest.documentIds()).containsExactly(10L);
        assertThat(aiRequest.question()).isEqualTo("Có mấy dạng chuẩn hóa?");
        assertThat(aiRequest.topK()).isEqualTo(5);
        assertThat(aiRequest.language()).isEqualTo("vi");
        assertThat(aiRequest.history()).hasSize(2);
        assertThat(aiRequest.history().get(0).role()).isEqualTo("user");
        assertThat(aiRequest.history().get(1).role()).isEqualTo("assistant");
        verify(transactionTemplate, times(2)).execute(any());
    }

    @Test
    void sendMessage_whenNotFound_shouldSaveAssistantMessageWithNotFound() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Câu hỏi không liên quan?");
        request.setTopK(5);
        request.setLanguage("vi");

        RagMessage savedUserMessage = createMessage(3L, conversation, RagMessageRole.user, "Câu hỏi không liên quan?", false, 0);
        RagMessage savedAssistantMessage = createMessage(4L, conversation, RagMessageRole.assistant,
                "Không tìm thấy thông tin này...", true, 0);

        AiAnswerQuestionResult aiResult = new AiAnswerQuestionResult(
                "Không tìm thấy thông tin này...",
                true,
                Collections.emptyList(),
                0
        );

        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));
        when(ragMessageRepository.save(any(RagMessage.class)))
                .thenAnswer(invocation -> {
                    RagMessage msg = invocation.getArgument(0);
                    return msg.getRole() == RagMessageRole.user ? savedUserMessage : savedAssistantMessage;
                });
        when(ragMessageRepository.findRecentMessagesBefore(eq(100L), any(Instant.class), eq(PageRequest.of(0, 6))))
                .thenReturn(Collections.emptyList());
        when(aiServiceClient.answerQuestionSync(any(AiAnswerQuestionRequest.class))).thenReturn(aiResult);
        when(ragConversationRepository.save(any(RagConversation.class))).thenReturn(conversation);

        RagSendMessageResponse response = ragConversationService.sendMessage(teacher, 100L, request);

        assertThat(response.getAssistantMessage().getNotFound()).isTrue();
        assertThat(response.getAssistantMessage().getCitations()).isEmpty();
        assertThat(response.getAssistantMessage().getTokensUsed()).isEqualTo(0);
    }

    @Test
    void sendMessage_whenUserNotOwner_shouldThrowConversationAccessDenied() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Câu hỏi?");

        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> ragConversationService.sendMessage(otherTeacher, 100L, request))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.CONVERSATION_ACCESS_DENIED));
    }

    @Test
    void sendMessage_whenDocumentNotProcessed_shouldThrowDocumentNotProcessed() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Câu hỏi?");

        conversation.setDocument(unprocessedDocument);
        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> ragConversationService.sendMessage(teacher, 100L, request))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.DOCUMENT_NOT_PROCESSED));
    }

    @Test
    void sendMessage_whenAiServiceFails_shouldThrowAiServiceError() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Câu hỏi?");
        request.setTopK(5);
        request.setLanguage("vi");

        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));
        when(ragMessageRepository.findRecentMessagesBefore(eq(100L), any(Instant.class), eq(PageRequest.of(0, 6))))
                .thenReturn(Collections.emptyList());
        when(aiServiceClient.answerQuestionSync(any(AiAnswerQuestionRequest.class)))
                .thenThrow(new RuntimeException("AI timeout"));

        assertThatThrownBy(() -> ragConversationService.sendMessage(teacher, 100L, request))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.AI_SERVICE_ERROR));
        verify(ragMessageRepository, never()).save(any());
    }

    // =========================================================
    // ===== GET MESSAGES =====
    // =========================================================

    @Test
    void getMessages_shouldReturnPagedMessages() {
        Pageable pageable = PageRequest.of(0, 30);
        Page<RagMessage> messagePage = new PageImpl<>(List.of(oldUserMessage, oldAssistantMessage), pageable, 2);

        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));
        when(ragMessageRepository.findByConversationIdOrderByCreatedAtDescIdDesc(100L, pageable))
                .thenReturn(messagePage);

        Page<RagMessageResponse> response = ragConversationService.getMessages(teacher, 100L, pageable);

        assertThat(response.getContent()).hasSize(2);
        assertThat(response.getContent().get(0).getRole()).isEqualTo("user");
        assertThat(response.getContent().get(1).getRole()).isEqualTo("assistant");
    }

    @Test
    void getMessages_whenUserNotOwner_shouldThrowConversationAccessDenied() {
        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> ragConversationService.getMessages(otherTeacher, 100L, PageRequest.of(0, 30)))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.CONVERSATION_ACCESS_DENIED));
    }

    // =========================================================
    // ===== CLEAR MESSAGES =====
    // =========================================================

    @Test
    void clearMessages_shouldDeleteMessagesAndResetCounters() {
        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));
        when(ragConversationRepository.save(any(RagConversation.class))).thenReturn(conversation);

        ragConversationService.clearMessages(teacher, 100L);

        verify(ragMessageRepository).deleteByConversationId(100L);
        assertThat(conversation.getMessageCount()).isEqualTo(0);
        assertThat(conversation.getLastMessageAt()).isNull();
        assertThat(conversation.getMessages()).isEmpty();
    }

    @Test
    void clearMessages_whenUserNotOwner_shouldThrowConversationAccessDenied() {
        when(ragConversationRepository.findById(100L)).thenReturn(Optional.of(conversation));

        assertThatThrownBy(() -> ragConversationService.clearMessages(otherTeacher, 100L))
                .isInstanceOf(AppException.class)
                .satisfies(e -> assertThat(((AppException) e).getErrorCode()).isEqualTo(ErrorCode.CONVERSATION_ACCESS_DENIED));
    }

    // =========================================================
    // ===== HELPERS =====
    // =========================================================

    private User createUser(Long id, String email, UserRole role) {
        return User.builder()
                .id(id)
                .email(email)
                .password("password")
                .name(email)
                .role(role)
                .status(UserStatus.ACTIVE)
                .build();
    }

    private Document createDocument(Long id, String title, PublicationStatus publicationStatus,
                                    AiProcessingStatus processingStatus) {
        return Document.builder()
                .id(id)
                .uploadedBy(teacher)
                .title(title)
                .subject("CSDL")
                .tags(List.of())
                .originalFilename("source.pdf")
                .storedFilename("source.pdf")
                .storageKey("documents/" + id + "/v1/source.pdf")
                .fileVersion(1)
                .fileType(com.lmsrag.backend.enums.DocumentFileType.PDF)
                .fileSize(1000L)
                .processingStatus(processingStatus)
                .publicationStatus(publicationStatus)
                .build();
    }

    private RagMessage createMessage(Long id, RagConversation conversation, RagMessageRole role,
                                     String content, boolean notFound, int tokensUsed) {
        RagMessage message = RagMessage.builder()
                .id(id)
                .conversation(conversation)
                .role(role)
                .content(content)
                .notFound(notFound)
                .tokensUsed(tokensUsed)
                .citationsJson(Collections.emptyList())
                .build();
        message.setCreatedAt(Instant.now());
        return message;
    }
}
