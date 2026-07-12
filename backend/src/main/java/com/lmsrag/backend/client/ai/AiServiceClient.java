package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentRequest;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.dto.ai.AiSuccessResponse;
import com.lmsrag.backend.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
public class AiServiceClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Key";

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
        validateInternalKey();

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

    private AiAnalyzeDocumentResult requireData(AiSuccessResponse<AiAnalyzeDocumentResult> response) {
        if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
            throw new AiServiceException(
                    "AI_INVALID_RESPONSE",
                    "AI Service trả response analyze-document không hợp lệ"
            );
        }
        return response.getData();
    }

    private void validateInternalKey() {
        if (properties.getInternalApiKey() == null || properties.getInternalApiKey().isBlank()) {
            throw new AiServiceException(
                    "AI_INTERNAL_KEY_MISSING",
                    "INTERNAL_API_KEY chưa được cấu hình cho Backend"
            );
        }
    }
}
