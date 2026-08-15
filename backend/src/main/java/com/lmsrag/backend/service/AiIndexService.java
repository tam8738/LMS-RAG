package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletionException;

/**
 * Điều phối việc lập chỉ mục RAG bất đồng bộ cho tài liệu đã được duyệt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiIndexService {

    private final AiServiceClient aiServiceClient;
    private final AiIndexResultHandler resultHandler;

    /**
     * Bắt đầu quá trình index RAG sau khi document được approve.
     * Chuyển trạng thái sang PROCESSING rồi gọi AI Service bất đồng bộ.
     */
    public void startIndex(Document document, DocumentProcessingJob job) {
        resultHandler.beginIndex(document.getId(), job.getId());
        requestIndexAsync(document, job);
    }

    /**
     * Gửi yêu cầu index-document đến AI Service một cách bất đồng bộ.
     */
    public void requestIndexAsync(Document document, DocumentProcessingJob job) {
        aiServiceClient.indexDocumentAsync(document)
                .whenComplete((result, error) -> {
                    if (error == null) {
                        resultHandler.handleSuccess(document.getId(), job.getId(), result);
                    } else {
                        resultHandler.handleFailure(document.getId(), job.getId(), unwrap(error));
                    }
                });
    }

    private static Throwable unwrap(Throwable error) {
        if (error instanceof CompletionException && error.getCause() != null) {
            return error.getCause();
        }
        return error;
    }
}
