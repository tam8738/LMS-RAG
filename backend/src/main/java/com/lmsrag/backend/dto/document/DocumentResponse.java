package com.lmsrag.backend.dto.document;

import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class DocumentResponse {

    private Long id;
    private String title;
    private String description;
    private String subject;
    private String topic;
    private String chapter;
    private List<String> tags;

    private String originalFilename;
    private String storedFilename;
    private String storageKey;
    private Integer fileVersion;
    private DocumentFileType fileType;
    private String mimeType;
    private Long fileSize;

    private ProcessingStatus processingStatus;
    private PublicationStatus publicationStatus;
    private String errorCode;
    private String errorMessage;
    private Instant processedAt;

    private Long reviewedBy;
    private String reviewerName;
    private Instant reviewedAt;
    private String rejectionReason;
    private Instant publishedAt;

    private Long uploadedBy;
    private String uploaderName;

    private Instant createdAt;
    private Instant updatedAt;
}