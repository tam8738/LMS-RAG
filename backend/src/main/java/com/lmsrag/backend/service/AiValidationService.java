package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletionException;

/**
 * Điều phối việc phân tích, kiểm tra tài liệu bất đồng bộ sau khi tải lên.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiValidationService {

    private final AiServiceClient aiServiceClient;
    private final AiValidationResultHandler resultHandler;

    /**
     * Bắt đầu quá trình analyze: chuyển trạng thái sang ANALYZING rồi gọi AI Service bất đồng bộ.
     * Kết quả sẽ được xử lý trong callback nội bộ của BE.
     */
    public void startAnalysis(Document document, DocumentProcessingJob job) {
        resultHandler.beginAnalysis(document.getId(), job.getId());
        requestValidationAsync(document, job);
    }

    /**
     * Gửi yêu cầu analyze-document đến AI Service một cách bất đồng bộ.
     */
    public void requestValidationAsync(Document document, DocumentProcessingJob job) {
        aiServiceClient.analyzeDocumentAsync(document)
                .whenComplete((result, error) -> {
                    if (error == null) {
                        resultHandler.handleSuccess(document.getId(), job.getId(), result);
                    } else {
                        resultHandler.handleFailure(document.getId(), job.getId(), unwrap(error));
                    }
                });
    }

    /**
     * Gọi đồng bộ analyze-document, chủ yếu dùng cho test hoặc retry.
     */
    public AiAnalyzeDocumentResult analyzeDocumentSync(Document document) {
        return aiServiceClient.analyzeDocumentSync(document);
    }

    private static Throwable unwrap(Throwable error) {
        if (error instanceof CompletionException && error.getCause() != null) {
            return error.getCause();
        }
        return error;
    }
}
