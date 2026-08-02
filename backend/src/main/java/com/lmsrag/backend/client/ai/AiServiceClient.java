package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
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
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
public class AiServiceClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Key";
    private static final int MAX_GENERATED_QUIZ_QUESTIONS = 20;

    private final AiServiceProperties properties;
    private final WebClient webClient;

    public AiServiceClient(AiServiceProperties properties, WebClient.Builder webClientBuilder) {
        this.properties = properties;
        this.webClient = webClientBuilder
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    /**
     * Gọi AI Service đánh giá khả năng RAG của document một cách bất đồng bộ.
     * Trả về Mono để caller có thể subscribe và xử lý kết quả/fire-and-forget.
     */
    public Mono<AiAnalyzeDocumentResult> analyzeDocumentAsync(Document document) {
        return validateInternalKey()
                .flatMap(ignored -> sendAnalyzeRequest(document));
    }

    /**
     * Gọi AI Service index RAG (chunk + embed) một cách bất đồng bộ.
     * Trả về Mono để caller subscribe và xử lý kết quả/fire-and-forget.
     */
    public Mono<AiIndexDocumentResult> indexDocumentAsync(Document document) {
        return validateInternalKey()
                .flatMap(ignored -> sendIndexRequest(document));
    }

    private Mono<AiAnalyzeDocumentResult> sendAnalyzeRequest(Document document) {
        AiAnalyzeDocumentRequest request = AiAnalyzeDocumentRequest.from(document);
        log.info("[AI] Gửi yêu cầu analyze-document async | documentId={} | storageKey={}",
                document.getId(), document.getStorageKey());

        return webClient.post()
                .uri("/v1/analyze-document")
                .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<AiSuccessResponse<AiAnalyzeDocumentResult>>() {
                })
                .map(this::requireData)
                .doOnNext(result -> log.info("[AI] Analyze async thành công | documentId={} | canRag={} | chunks={}",
                        result.getDocumentId(), result.getCanRag(), result.getEstimatedChunkCount()))
                .doOnError(e -> log.error("[AI] Analyze async thất bại | documentId={}", document.getId(), e));
    }

    private Mono<AiIndexDocumentResult> sendIndexRequest(Document document) {
        AiIndexDocumentRequest request = AiIndexDocumentRequest.from(document);
        log.info("[AI] Gửi yêu cầu index-document async | documentId={} | storageKey={}",
                document.getId(), document.getStorageKey());

        return webClient.post()
                .uri("/v1/index-document")
                .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<AiSuccessResponse<AiIndexDocumentResult>>() {
                })
                .map(this::requireIndexData)
                .doOnNext(result -> log.info("[AI] Index async thành công | documentId={} | chunks={}",
                        result.getDocumentId(), result.getChunkCount()))
                .doOnError(e -> log.error("[AI] Index async thất bại | documentId={}", document.getId(), e));
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

    /**
     * Gọi AI Service /v1/answer-question một cách đồng bộ.
     * Dùng cho RAG proxy vì Frontend đang chờ response.
     */
    public AiAnswerQuestionResult answerQuestionSync(AiAnswerQuestionRequest request) {
        log.info("[AI] Gửi yêu cầu answer-question sync | documentIds={} | question={}",
                request.documentIds(), request.question());

        try {
            return webClient.post()
                    .uri("/v1/answer-question")
                    .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<AiSuccessResponse<AiAnswerQuestionResult>>() {
                    })
                    .map(this::requireAnswerData)
                    .doOnNext(result -> log.info("[AI] Answer-question sync thành công | notFound={} | citations={}",
                            result.notFound(), result.citations() != null ? result.citations().size() : 0))
                    .block();
        } catch (WebClientResponseException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("[AI] Answer-question sync thất bại | status={} | body={} | documentIds={}",
                    e.getStatusCode(), responseBody, request.documentIds());
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    String.format("AI Service trả lỗi %s: %s", e.getStatusCode(), responseBody),
                    e
            );
        } catch (Exception e) {
            log.error("[AI] Answer-question sync thất bại | documentIds={}", request.documentIds(), e);
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    "Lỗi khi gọi AI Service: " + e.getMessage(),
                    e
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

    /** Gọi AI Service đồng bộ để sinh quiz draft từ document đã được Backend kiểm quyền. */
    public AiGenerateQuizResult generateQuizSync(AiGenerateQuizRequest request) {
        log.info("[AI] Gửi yêu cầu generate-quiz sync | documentIds={} | questionCount={} | language={}",
                request.documentIds(), request.questionCount(), request.language());

        try {
            AiGenerateQuizResult result = webClient.post()
                    .uri("/v1/generate-quiz")
                    .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<AiSuccessResponse<AiGenerateQuizResult>>() {
                    })
                    .map(this::requireQuizData)
                    .block();

            if (result == null || result.questions().size() != request.questionCount()) {
                throw new AiServiceException(
                        "AI_INVALID_RESPONSE",
                        "AI Service trả response generate-quiz sai số lượng câu hỏi"
                );
            }

            log.info("[AI] Generate-quiz sync thành công | documentIds={} | questions={} | tokensUsed={}",
                    request.documentIds(), result.questions().size(), result.tokensUsed());
            return result;
        } catch (WebClientResponseException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("[AI] Generate-quiz sync thất bại | status={} | body={} | documentIds={}",
                    e.getStatusCode(), responseBody, request.documentIds());
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    String.format("AI Service trả lỗi %s: %s", e.getStatusCode(), responseBody),
                    e
            );
        } catch (AiServiceException e) {
            log.error("[AI] Generate-quiz sync nhận response không hợp lệ | code={} | documentIds={}",
                    e.getErrorCode(), request.documentIds());
            throw e;
        } catch (Exception e) {
            log.error("[AI] Generate-quiz sync thất bại | documentIds={}", request.documentIds(), e);
            throw new AiServiceException(
                    "AI_SERVICE_ERROR",
                    "Lỗi khi gọi AI Service: " + e.getMessage(),
                    e
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

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Mono<Boolean> validateInternalKey() {
        if (properties.getInternalApiKey() == null || properties.getInternalApiKey().isBlank()) {
            return Mono.error(new AiServiceException(
                    "AI_INTERNAL_KEY_MISSING",
                    "INTERNAL_API_KEY chưa được cấu hình cho Backend"
            ));
        }
        return Mono.just(Boolean.TRUE);
    }
}
