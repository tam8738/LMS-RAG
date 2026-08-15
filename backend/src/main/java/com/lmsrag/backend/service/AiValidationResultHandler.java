package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
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
 * Đồng bộ kết quả phân tích từ AI Service vào tài liệu và tác vụ tương ứng.
 */
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

        document.setProcessingStatus(AiProcessingStatus.ANALYZING);
        // Job cũng ở ANALYZING trong giai đoạn analyze nhẹ; không dùng PROCESSING để tránh lẫn với index RAG
        job.setStatus(AiProcessingStatus.ANALYZING);

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

        log.info("[AI] Trước khi lưu analyze | documentId={} | oldStatus={} | newStatus=ANALYZED",
                documentId, document.getProcessingStatus());

        // Analyze nhẹ xong -> document chỉ ANALYZED; PROCESSED dành cho sau khi index RAG
        document.setProcessingStatus(AiProcessingStatus.ANALYZED);
        document.setRagEligible(Boolean.TRUE.equals(result.getCanRag()));
        document.setPageCount(result.getPageCount());
        document.setEstimatedTokenCount(result.getEstimatedTokenCount());
        document.setEstimatedChunkCount(result.getEstimatedChunkCount());
        document.setUnsupportedReason(result.getUnsupportedReason());
        document.setAnalyzedAt(now);
        document.setErrorCode(null);
        document.setErrorMessage(null);

        job.setStatus(AiProcessingStatus.PROCESSED);
        job.setChunkCount(result.getEstimatedChunkCount());
        job.setCompletedAt(now);
        job.setErrorCode(null);
        job.setErrorMessage(null);

        Document savedDocument = documentRepository.save(document);
        jobRepository.save(job);

        log.info("[AI] Document đã được đánh giá | documentId={} | ragEligible={} | savedStatus={}",
                documentId, savedDocument.getRagEligible(), savedDocument.getProcessingStatus());
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

        // Dù analyze thất bại, document vẫn được coi là "đã analyze xong" để teacher có thể submit review.
        // Trạng thái thực sự của RAG được thể hiện qua ragEligible + errorCode/errorMessage.
        document.setProcessingStatus(AiProcessingStatus.ANALYZED);
        document.setRagEligible(false);
        document.setAnalyzedAt(now);
        document.setErrorCode("AI_ANALYZE_FAILED");
        document.setErrorMessage(errorMessage);

        job.setStatus(AiProcessingStatus.FAILED);
        job.setCompletedAt(now);
        job.setErrorCode("AI_ANALYZE_FAILED");
        job.setErrorMessage(errorMessage);

        documentRepository.save(document);
        jobRepository.save(job);
    }
}
