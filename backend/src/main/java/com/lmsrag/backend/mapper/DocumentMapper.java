package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.entity.Document;

public class DocumentMapper {

    public static DocumentResponse toResponse(Document document) {
        if (document == null) {
            return null;
        }

        return DocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .description(document.getDescription())
                .subject(document.getSubject())
                .topic(document.getTopic())
                .chapter(document.getChapter())
                .tags(document.getTags())

                .originalFilename(document.getOriginalFilename())
                .storedFilename(document.getStoredFilename())
                .storageKey(document.getStorageKey())
                .fileVersion(document.getFileVersion())
                .fileType(document.getFileType())
                .mimeType(document.getMimeType())
                .fileSize(document.getFileSize())

                .processingStatus(document.getProcessingStatus())
                .publicationStatus(document.getPublicationStatus())
                .errorCode(document.getErrorCode())
                .errorMessage(document.getErrorMessage())
                .processedAt(document.getProcessedAt())

                .ragStatus(document.getRagStatus())
                .analysisErrorCode(document.getAnalysisErrorCode())
                .analysisErrorMessage(document.getAnalysisErrorMessage())
                .unsupportedReason(document.getUnsupportedReason())
                .pageCount(document.getPageCount())
                .estimatedTokenCount(document.getEstimatedTokenCount())
                .estimatedChunkCount(document.getEstimatedChunkCount())
                .analyzedAt(document.getAnalyzedAt())
                .ragErrorCode(document.getRagErrorCode())
                .ragErrorMessage(document.getRagErrorMessage())
                .indexedAt(document.getIndexedAt())

                .reviewedBy(document.getReviewedBy() != null ? document.getReviewedBy().getId() : null)
                .reviewerName(document.getReviewedBy() != null ? document.getReviewedBy().getName() : null)
                .reviewedAt(document.getReviewedAt())
                .rejectionReason(document.getRejectionReason())
                .publishedAt(document.getPublishedAt())

                .uploadedBy(document.getUploadedBy() != null ? document.getUploadedBy().getId() : null)
                .uploaderName(document.getUploadedBy() != null ? document.getUploadedBy().getName() : null)

                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }
}