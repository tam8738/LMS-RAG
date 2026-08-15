package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
import com.lmsrag.backend.config.AsyncConfig;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentRequest;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionRequest;
import com.lmsrag.backend.dto.ai.AiAnswerQuestionResult;
import com.lmsrag.backend.dto.ai.AiGenerateQuizRequest;
import com.lmsrag.backend.dto.ai.AiGenerateQuizResult;
import com.lmsrag.backend.dto.ai.AiIndexDocumentRequest;
import com.lmsrag.backend.dto.ai.AiIndexDocumentResult;
import com.lmsrag.backend.dto.ai.AiQuizCitation;
import com.lmsrag.backend.dto.ai.AiQuizOption;
import com.lmsrag.backend.dto.ai.AiQuizQuestion;
import com.lmsrag.backend.dto.ai.AiSuccessResponse;
import com.lmsrag.backend.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.function.Supplier;

/**
 * Cổng giao tiếp HTTP giữa Backend và AI Service, bao gồm ánh xạ lỗi và chính sách gọi lại.
 */
@Slf4j
@Component
public class AiServiceClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Key";
    private static final int MAX_GENERATED_QUIZ_QUESTIONS = 20;

    private final AiServiceProperties properties;
    private final RestClient restClient;
    private final Executor aiTaskExecutor;

    public AiServiceClient(
            AiServiceProperties properties,
            RestClient.Builder restClientBuilder,
            @Qualifier(AsyncConfig.AI_TASK_EXECUTOR) Executor aiTaskExecutor
    ) {
        this.properties = properties;
        this.restClient = restClientBuilder
                .baseUrl(properties.getBaseUrl())
                .build();
        this.aiTaskExecutor = aiTaskExecutor;
    }

    /** Chạy tác vụ phân tích tài liệu trên bộ thực thi AI có giới hạn. */
    public CompletableFuture<AiAnalyzeDocumentResult> analyzeDocumentAsync(Document document) {
        return submitAsync(() -> sendAnalyzeRequest(document));
    }

    /** Chạy tác vụ lập chỉ mục tài liệu trên bộ thực thi AI có giới hạn. */
    public CompletableFuture<AiIndexDocumentResult> indexDocumentAsync(Document document) {
        return submitAsync(() -> sendIndexRequest(document));
    }

    /** Biến thể đồng bộ dành cho luồng gọi lại và kiểm thử. */
    public AiAnalyzeDocumentResult analyzeDocumentSync(Document document) {
        requireInternalKey();
        return sendAnalyzeRequest(document);
    }

    private AiAnalyzeDocumentResult sendAnalyzeRequest(Document document) {
        AiAnalyzeDocumentRequest request = AiAnalyzeDocumentRequest.from(document);
        log.info("[AI] Sending analyze-document | documentId={} | storageKey={}",
                document.getId(), document.getStorageKey());

        AiSuccessResponse<AiAnalyzeDocumentResult> response = post(
                "/v1/analyze-document",
                request,
                new ParameterizedTypeReference<>() {
                }
        );
        AiAnalyzeDocumentResult result = requireData(response);
        log.info("[AI] Analyze succeeded | documentId={} | canRag={} | chunks={}",
                result.getDocumentId(), result.getCanRag(), result.getEstimatedChunkCount());
        return result;
    }

    private AiIndexDocumentResult sendIndexRequest(Document document) {
        AiIndexDocumentRequest request = AiIndexDocumentRequest.from(document);
        log.info("[AI] Sending index-document | documentId={} | storageKey={}",
                document.getId(), document.getStorageKey());

        AiSuccessResponse<AiIndexDocumentResult> response = post(
                "/v1/index-document",
                request,
                new ParameterizedTypeReference<>() {
                }
        );
        AiIndexDocumentResult result = requireIndexData(response);
        log.info("[AI] Index succeeded | documentId={} | chunks={}",
                result.getDocumentId(), result.getChunkCount());
        return result;
    }

    private AiAnalyzeDocumentResult requireData(AiSuccessResponse<AiAnalyzeDocumentResult> response) {
        if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
            throw new AiServiceException(
                    "AI_INVALID_RESPONSE",
                    "AI Service trả response analyze-document không hợp lệ"
            );
        }
        return response.getData();
    }

    private AiIndexDocumentResult requireIndexData(AiSuccessResponse<AiIndexDocumentResult> response) {
        if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
            throw new AiServiceException(
                    "AI_INVALID_RESPONSE",
                    "AI Service trả response index-document không hợp lệ"
            );
        }
        return response.getData();
    }

    /** Gọi hỏi đáp đồng bộ vì frontend cần chờ kết quả để phản hồi người dùng. */
    public AiAnswerQuestionResult answerQuestionSync(AiAnswerQuestionRequest request) {
        log.info("[AI] Sending answer-question | documentIds={} | question={}",
                request.documentIds(), request.question());

        try {
            AiSuccessResponse<AiAnswerQuestionResult> response = post(
                    "/v1/answer-question",
                    request,
                    new ParameterizedTypeReference<>() {
                    }
            );
            AiAnswerQuestionResult result = requireAnswerData(response);
            log.info("[AI] Answer-question succeeded | notFound={} | citations={}",
                    result.notFound(), result.citations() != null ? result.citations().size() : 0);
            return result;
        } catch (RestClientResponseException exception) {
            String responseBody = exception.getResponseBodyAsString();
            log.error("[AI] Answer-question failed | status={} | body={} | documentIds={}",
                    exception.getStatusCode(), responseBody, request.documentIds());
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    String.format("AI Service trả lỗi %s: %s", exception.getStatusCode(), responseBody),
                    exception
            );
        } catch (Exception exception) {
            log.error("[AI] Answer-question failed | documentIds={}", request.documentIds(), exception);
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    "Lỗi khi gọi AI Service: " + exception.getMessage(),
                    exception
            );
        }
    }

    private AiAnswerQuestionResult requireAnswerData(AiSuccessResponse<AiAnswerQuestionResult> response) {
        if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
            throw new AiServiceException(
                    "AI_INVALID_RESPONSE",
                    "AI Service trả response answer-question không hợp lệ"
            );
        }
        return response.getData();
    }

    /** Sinh quiz đồng bộ sau khi Backend hoàn tất kiểm tra quyền truy cập. */
    public AiGenerateQuizResult generateQuizSync(AiGenerateQuizRequest request) {
        log.info("[AI] Sending generate-quiz | documentIds={} | questionCount={} | language={}",
                request.documentIds(), request.questionCount(), request.language());

        try {
            AiSuccessResponse<AiGenerateQuizResult> response = post(
                    "/v1/generate-quiz",
                    request,
                    new ParameterizedTypeReference<>() {
                    }
            );
            AiGenerateQuizResult result = requireQuizData(response);

            if (result.questions().size() != request.questionCount()) {
                throw new AiServiceException(
                        "AI_INVALID_RESPONSE",
                        "AI Service trả response generate-quiz sai số lượng câu hỏi"
                );
            }

            log.info("[AI] Generate-quiz succeeded | documentIds={} | questions={} | tokensUsed={}",
                    request.documentIds(), result.questions().size(), result.tokensUsed());
            return result;
        } catch (RestClientResponseException exception) {
            String responseBody = exception.getResponseBodyAsString();
            log.error("[AI] Generate-quiz failed | status={} | body={} | documentIds={}",
                    exception.getStatusCode(), responseBody, request.documentIds());
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    String.format("AI Service trả lỗi %s: %s", exception.getStatusCode(), responseBody),
                    exception
            );
        } catch (AiServiceException exception) {
            log.error("[AI] Generate-quiz returned invalid data | code={} | documentIds={}",
                    exception.getErrorCode(), request.documentIds());
            throw exception;
        } catch (Exception exception) {
            log.error("[AI] Generate-quiz failed | documentIds={}", request.documentIds(), exception);
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    "Lỗi khi gọi AI Service: " + exception.getMessage(),
                    exception
            );
        }
    }

    private AiGenerateQuizResult requireQuizData(AiSuccessResponse<AiGenerateQuizResult> response) {
        if (response == null
                || !Boolean.TRUE.equals(response.getSuccess())
                || response.getData() == null
                || isBlank(response.getData().title())
                || response.getData().title().length() > 200
                || isBlank(response.getData().description())
                || response.getData().description().length() > 1000
                || response.getData().tokensUsed() == null
                || response.getData().tokensUsed() < 0
                || response.getData().questions() == null
                || response.getData().questions().isEmpty()
                || response.getData().questions().size() > MAX_GENERATED_QUIZ_QUESTIONS
                || response.getData().questions().stream().anyMatch(this::isInvalidQuizQuestion)) {
            throw new AiServiceException(
                    "AI_INVALID_RESPONSE",
                    "AI Service trả response generate-quiz không hợp lệ"
            );
        }
        return response.getData();
    }

    private boolean isInvalidQuizQuestion(AiQuizQuestion question) {
        if (question == null
                || isBlank(question.question())
                || question.question().length() > 1000
                || !"single_choice".equals(question.type())
                || question.options() == null
                || question.options().size() < 2
                || question.options().size() > 4
                || question.correctOptionIds() == null
                || question.correctOptionIds().size() != 1
                || isBlank(question.explanation())
                || question.explanation().length() > 1200
                || question.citations() == null
                || question.citations().size() > 3
                || question.citations().stream().anyMatch(this::isInvalidQuizCitation)) {
            return true;
        }

        Set<String> optionIds = new HashSet<>();
        for (AiQuizOption option : question.options()) {
            if (option == null
                    || option.id() == null
                    || !option.id().matches("[A-D]")
                    || isBlank(option.text())
                    || option.text().length() > 500
                    || !optionIds.add(option.id())) {
                return true;
            }
        }
        return !optionIds.contains(question.correctOptionIds().getFirst());
    }

    private boolean isInvalidQuizCitation(AiQuizCitation citation) {
        return citation == null
                || citation.chunkId() == null
                || citation.chunkId() <= 0
                || citation.documentId() == null
                || citation.documentId() <= 0
                || citation.pageNumber() != null && citation.pageNumber() <= 0
                || citation.chunkIndex() == null
                || citation.chunkIndex() < 0
                || isBlank(citation.excerpt())
                || citation.excerpt().length() > 500;
    }

    private <T> AiSuccessResponse<T> post(
            String uri,
            Object request,
            ParameterizedTypeReference<AiSuccessResponse<T>> responseType
    ) {
        return restClient.post()
                .uri(uri)
                .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                .body(request)
                .retrieve()
                .body(responseType);
    }

    private <T> CompletableFuture<T> submitAsync(Supplier<T> task) {
        try {
            requireInternalKey();
            return CompletableFuture.supplyAsync(task, aiTaskExecutor);
        } catch (RuntimeException exception) {
            return CompletableFuture.failedFuture(exception);
        }
    }

    private void requireInternalKey() {
        if (properties.getInternalApiKey() == null || properties.getInternalApiKey().isBlank()) {
            throw new AiServiceException(
                    "AI_INTERNAL_KEY_MISSING",
                    "INTERNAL_API_KEY chưa được cấu hình cho Backend"
            );
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
