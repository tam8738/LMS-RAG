package com.lmsrag.backend.dto.document;

import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import lombok.Data;

@Data
public class AdminDocumentFilterRequest {

    private String q;

    private AiProcessingStatus processingStatus;

    private PublicationStatus publicationStatus;

    private String subject;

    private String topic;

    private String chapter;

    private String tags;

    private Long uploadedBy;
}
