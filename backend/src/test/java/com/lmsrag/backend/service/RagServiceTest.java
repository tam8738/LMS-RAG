package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionRequest;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionResult;
import com.lmsrag.backend.dto.rag.RagAnswerRequest;
import com.lmsrag.backend.dto.rag.RagAnswerResponse;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RagServiceTest {

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private TransactionTemplate transactionTemplate;

    @Mock
    private AiRequestGuard aiRequestGuard;

    private RagService ragService;
    private AtomicBoolean transactionTemplateActive;

    @BeforeEach
    void setUp() {
        transactionTemplateActive = new AtomicBoolean(false);
        doAnswer(invocation -> {
            Consumer<TransactionStatus> callback = invocation.getArgument(0);
            assertThat(transactionTemplateActive.compareAndSet(false, true)).isTrue();
            try {
                callback.accept(null);
            } finally {
                transactionTemplateActive.set(false);
            }
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());
        when(aiRequestGuard.execute(any(), any(), any())).thenAnswer(invocation -> {
            Supplier<?> action = invocation.getArgument(2);
            return action.get();
        });

        ragService = new RagService(documentRepository, aiServiceClient, transactionTemplate, aiRequestGuard);
    }

    @Test
    void answer_shouldValidateInShortTransactionAndCallAiOutsideTransaction() {
        Document document = Document.builder()
                .id(10L)
                .publicationStatus(PublicationStatus.PUBLISHED)
                .processingStatus(AiProcessingStatus.PROCESSED)
                .build();
        RagAnswerRequest request = new RagAnswerRequest();
        request.setDocumentIds(List.of(10L, 10L));
        request.setQuestion("Chuẩn hóa dữ liệu là gì?");
        request.setTopK(5);
        request.setLanguage("vi");

        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        when(aiServiceClient.answerQuestionSync(any(AiAnswerQuestionRequest.class))).thenAnswer(invocation -> {
            assertThat(transactionTemplateActive).isFalse();
            return new AiAnswerQuestionResult("Câu trả lời", false, List.of(), 20);
        });

        RagAnswerResponse response = ragService.answer(User.builder().id(1L).build(), request);

        assertThat(response.getAnswer()).isEqualTo("Câu trả lời");
        verify(transactionTemplate).executeWithoutResult(any());
        verify(documentRepository).findById(10L);
    }
}
