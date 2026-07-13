package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
                .subscribe(
                        result -> resultHandler.handleSuccess(document.getId(), job.getId(), result),
                        error -> resultHandler.handleFailure(document.getId(), job.getId(), error)
                );
    }
}
