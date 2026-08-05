package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.dto.ai.AiAnswerCitation;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionRequest;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionResult;
import com.lmsrag.backend.dto.ai.AiChatMessage;
import com.lmsrag.backend.dto.rag.RagAnswerRequest;
import com.lmsrag.backend.dto.rag.RagAnswerResponse;
import com.lmsrag.backend.dto.rag.RagChatMessage;
import com.lmsrag.backend.dto.rag.RagCitation;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagService {

    private final DocumentRepository documentRepository;
    private final AiServiceClient aiServiceClient;
    private final TransactionTemplate transactionTemplate;
    private final AiRequestGuard aiRequestGuard;

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public RagAnswerResponse answer(User currentUser, RagAnswerRequest request) {
        List<Long> documentIds = request.getDocumentIds().stream()
                .distinct()
                .toList();

        log.info("[RAG] Nhận yêu cầu hỏi đáp | documentIds={} | question={}", documentIds, request.getQuestion());

        transactionTemplate.executeWithoutResult(status -> {
            // Kiểm tra từng document phải tồn tại, PUBLISHED và đã PROCESSED.
            for (Long documentId : documentIds) {
                validateDocumentForRag(documentId);
            }
        });

        AiAnswerQuestionRequest aiRequest = new AiAnswerQuestionRequest(
                documentIds,
                request.getQuestion(),
                request.getTopK(),
                request.getLanguage(),
                mapHistory(request.getHistory())
        );

        AiAnswerQuestionResult result = aiRequestGuard.execute(
                currentUser.getId(),
                "rag-answer",
                () -> aiServiceClient.answerQuestionSync(aiRequest)
        );

        return mapToResponse(result);
    }

    private void validateDocumentForRag(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        if (document.getPublicationStatus() != PublicationStatus.PUBLISHED) {
            log.warn("[RAG] Tài liệu chưa được công bố | documentId={} | status={}",
                    documentId, document.getPublicationStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PUBLISHED);
        }

        if (document.getProcessingStatus() != AiProcessingStatus.PROCESSED) {
            log.warn("[RAG] Tài liệu chưa được xử lý RAG xong | documentId={} | processingStatus={}",
                    documentId, document.getProcessingStatus());
            throw new AppException(ErrorCode.DOCUMENT_NOT_PROCESSED);
        }
    }

    private List<AiChatMessage> mapHistory(List<RagChatMessage> history) {
        if (history == null || history.isEmpty()) {
            return null;
        }
        return history.stream()
                .map(msg -> new AiChatMessage(msg.getRole(), msg.getContent()))
                .toList();
    }

    private RagAnswerResponse mapToResponse(AiAnswerQuestionResult result) {
        List<RagCitation> citations = result.citations() == null
                ? List.of()
                : result.citations().stream()
                        .map(this::mapCitation)
                        .toList();

        return RagAnswerResponse.builder()
                .answer(result.answer())
                .notFound(Boolean.TRUE.equals(result.notFound()))
                .citations(citations)
                .tokensUsed(result.tokensUsed())
                .build();
    }

    private RagCitation mapCitation(AiAnswerCitation citation) {
        return RagCitation.builder()
                .chunkId(citation.chunkId())
                .documentId(citation.documentId())
                .pageNumber(citation.pageNumber())
                .chunkIndex(citation.chunkIndex())
                .excerpt(citation.excerpt())
                .score(citation.score())
                .build();
    }
}
