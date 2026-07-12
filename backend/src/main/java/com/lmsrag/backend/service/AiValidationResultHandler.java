package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.repository.DocumentProcessingJobRepository;
import com.lmsrag.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiValidationResultHandler {

    private final DocumentRepository documentRepository;
    private final DocumentProcessingJobRepository jobRepository;

    @Transactional
    public void beginAnalysis(Long documentId, Long jobId) {
        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi bắt đầu analyze | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        document.setProcessingStatus(ProcessingStatus.ANALYZING);
        job.setStatus(ProcessingStatus.ANALYZING);

        documentRepository.save(document);
        jobRepository.save(job);

        log.info("[AI] Bắt đầu analyze | documentId={} | jobId={}", documentId, jobId);
    }

    @Transactional
    public void handleSuccess(Long documentId, Long jobId, AiAnalyzeDocumentResult result) {
        log.info("[AI] Xử lý kết quả analyze thành công | documentId={} | canRag={}",
                documentId, result.getCanRag());

        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi xử lý analyze | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        Instant now = Instant.now();

        document.setProcessingStatus(ProcessingStatus.PROCESSED);
        document.setProcessedAt(now);
        document.setRagEligible(Boolean.TRUE.equals(result.getCanRag()));
        document.setPageCount(result.getPageCount());
        document.setEstimatedTokenCount(result.getEstimatedTokenCount());
        document.setEstimatedChunkCount(result.getEstimatedChunkCount());
        document.setUnsupportedReason(result.getUnsupportedReason());
        document.setAnalyzedAt(now);
        document.setErrorCode(null);
        document.setErrorMessage(null);

        job.setStatus(ProcessingStatus.PROCESSED);
        job.setChunkCount(result.getEstimatedChunkCount());
        job.setCompletedAt(now);
        job.setErrorCode(null);
        job.setErrorMessage(null);

        documentRepository.save(document);
        jobRepository.save(job);

        log.info("[AI] Document đã được đánh giá | documentId={} | ragEligible={}",
                documentId, document.getRagEligible());
    }

    @Transactional
    public void handleFailure(Long documentId, Long jobId, Throwable error) {
        log.error("[AI] Xử lý analyze thất bại | documentId={}", documentId, error);

        Document document = documentRepository.findById(documentId).orElse(null);
        DocumentProcessingJob job = jobRepository.findById(jobId).orElse(null);

        if (document == null || job == null) {
            log.warn("[AI] Không tìm thấy document/job khi xử lý lỗi analyze | documentId={} | jobId={}",
                    documentId, jobId);
            return;
        }

        Instant now = Instant.now();
        String errorMessage = error.getMessage();
        if (errorMessage == null || errorMessage.isBlank()) {
            errorMessage = "AI Service analyze-document thất bại";
        }

        document.setProcessingStatus(ProcessingStatus.FAILED);
        document.setRagEligible(false);
        document.setAnalyzedAt(now);
        document.setErrorCode("AI_ANALYZE_FAILED");
        document.setErrorMessage(errorMessage);

        job.setStatus(ProcessingStatus.FAILED);
        job.setCompletedAt(now);
        job.setErrorCode("AI_ANALYZE_FAILED");
        job.setErrorMessage(errorMessage);

        documentRepository.save(document);
        jobRepository.save(job);
    }
}
