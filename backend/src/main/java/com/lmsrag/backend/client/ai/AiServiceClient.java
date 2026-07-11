package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentRequest;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.dto.ai.AiSuccessResponse;
import com.lmsrag.backend.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Slf4j
@Component
public class AiServiceClient {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Key";

    private final AiServiceProperties properties;
    private final RestClient restClient;

    public AiServiceClient(AiServiceProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder
                .baseUrl(properties.getBaseUrl())
                .build();
    }

    public AiAnalyzeDocumentResult analyzeDocument(Document document) {
        validateInternalKey();

        AiAnalyzeDocumentRequest request = AiAnalyzeDocumentRequest.from(document);
        log.info("[AI] Gọi analyze-document | documentId={} | storageKey={}",
                document.getId(), document.getStorageKey());

        try {
            AiSuccessResponse<AiAnalyzeDocumentResult> response = restClient.post()
                    .uri("/v1/analyze-document")
                    .header(INTERNAL_KEY_HEADER, properties.getInternalApiKey())
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });

            if (response == null || !Boolean.TRUE.equals(response.getSuccess()) || response.getData() == null) {
                throw new AiServiceException(
                        "AI_INVALID_RESPONSE",
                        "AI Service trả response analyze-document không hợp lệ"
                );
            }

            AiAnalyzeDocumentResult result = response.getData();
            log.info("[AI] Analyze thành công | documentId={} | ragStatus={} | chunks={}",
                    result.getDocumentId(), result.getRagStatus(), result.getEstimatedChunkCount());
            return result;
        } catch (RestClientResponseException e) {
            log.warn("[AI] Analyze thất bại từ AI Service | documentId={} | status={} | body={}",
                    document.getId(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiServiceException(
                    "AI_ANALYZE_FAILED",
                    "AI Service analyze-document thất bại: HTTP " + e.getStatusCode(),
                    e
            );
        } catch (RestClientException e) {
            log.warn("[AI] Không gọi được AI Service analyze-document | documentId={} | error={}",
                    document.getId(), e.getMessage());
            throw new AiServiceException(
                    "AI_SERVICE_UNAVAILABLE",
                    "Không gọi được AI Service analyze-document",
                    e
            );
        }
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