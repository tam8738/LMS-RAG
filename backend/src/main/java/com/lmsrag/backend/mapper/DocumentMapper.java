package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.User;

import java.util.Map;
import java.util.function.Function;

/**
 * Chuyển đổi thực thể tài liệu sang mô hình phản hồi API.
 */

public class DocumentMapper {

    public static DocumentResponse toResponse(Document document) {
        return toResponse(document, User::getName);
    }

    /** Ánh xạ danh sách bằng dữ liệu tên đã nạp theo lô để tránh truy vấn N+1 trên lazy User. */
    public static DocumentResponse toResponse(Document document, Map<Long, String> userNamesById) {
        return toResponse(document, user -> userNamesById.get(user.getId()));
    }

    private static DocumentResponse toResponse(Document document, Function<User, String> resolveUserName) {
        if (document == null) {
            return null;
        }

        User reviewer = document.getReviewedBy();
        User uploader = document.getUploadedBy();

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

                .ragEligible(document.getRagEligible())
                .pageCount(document.getPageCount())
                .estimatedTokenCount(document.getEstimatedTokenCount())
                .estimatedChunkCount(document.getEstimatedChunkCount())
                .unsupportedReason(document.getUnsupportedReason())
                .analyzedAt(document.getAnalyzedAt())

                .reviewedBy(reviewer != null ? reviewer.getId() : null)
                .reviewerName(reviewer != null ? resolveUserName.apply(reviewer) : null)
                .reviewedAt(document.getReviewedAt())
                .rejectionReason(document.getRejectionReason())
                .publishedAt(document.getPublishedAt())

                .uploadedBy(uploader != null ? uploader.getId() : null)
                .uploaderName(uploader != null ? resolveUserName.apply(uploader) : null)

                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .build();
    }
}
