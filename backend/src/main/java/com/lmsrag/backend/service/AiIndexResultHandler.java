package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.ai.AiIndexDocumentResult;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.repository.DocumentProcessingJobRepository;
import com.lmsrag.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Đồng bộ kết quả lập chỉ mục từ AI Service vào trạng thái tài liệu và tác vụ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiIndexResultHandler {

    private final DocumentRepository documentRepository;
    private final DocumentProcessingJobRepository jobRepository;

    @Transactional
    public void beginIndex(Long documentId, Long jobId) {
        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi bắt đầu index | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        document.setProcessingStatus(AiProcessingStatus.PROCESSING);
        job.setStatus(AiProcessingStatus.PROCESSING);

        documentRepository.save(document);
        jobRepository.save(job);

        log.info("[AI] Bắt đầu index RAG | documentId={} | jobId={}", documentId, jobId);
    }

    @Transactional
    public void handleSuccess(Long documentId, Long jobId, AiIndexDocumentResult result) {
        log.info("[AI] Xử lý kết quả index thành công | documentId={} | chunks={}",
                documentId, result.getChunkCount());

        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi xử lý index | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        Instant now = Instant.now();

        document.setProcessingStatus(AiProcessingStatus.PROCESSED);
        document.setProcessedAt(now);
        document.setPageCount(result.getPageCount());
        document.setEstimatedChunkCount(result.getChunkCount());
        document.setErrorCode(null);
        document.setErrorMessage(null);

        job.setStatus(AiProcessingStatus.PROCESSED);
        job.setChunkCount(result.getChunkCount());
        job.setCompletedAt(now);
        job.setErrorCode(null);
        job.setErrorMessage(null);

        documentRepository.save(document);
        jobRepository.save(job);

        log.info("[AI] Document đã được index RAG | documentId={} | chunks={}",
                documentId, result.getChunkCount());
    }

    @Transactional
    public void handleFailure(Long documentId, Long jobId, Throwable error) {
        log.error("[AI] Xử lý index thất bại | documentId={}", documentId, error);

        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi xử lý lỗi index | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        Instant now = Instant.now();
        String errorMessage = error.getMessage();
        if (errorMessage == null || errorMessage.isBlank()) {
            errorMessage = "AI Service index-document thất bại";
        }

        document.setProcessingStatus(AiProcessingStatus.FAILED);
        document.setErrorCode("AI_INDEX_FAILED");
        document.setErrorMessage(errorMessage);

        job.setStatus(AiProcessingStatus.FAILED);
        job.setCompletedAt(now);
        job.setErrorCode("AI_INDEX_FAILED");
        job.setErrorMessage(errorMessage);

        documentRepository.save(document);
        jobRepository.save(job);
    }
}
