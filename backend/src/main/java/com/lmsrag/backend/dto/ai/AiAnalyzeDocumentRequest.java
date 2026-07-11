package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lmsrag.backend.entity.Document;

public record AiAnalyzeDocumentRequest(
        @JsonProperty("document_id") Long documentId,
        @JsonProperty("storage_key") String storageKey,
        @JsonProperty("file_type") String fileType,
        AiDocumentMetadata metadata
) {
    public static AiAnalyzeDocumentRequest from(Document document) {
        return new AiAnalyzeDocumentRequest(
                document.getId(),
                document.getStorageKey(),
                document.getFileType().name(),
                new AiDocumentMetadata(
                        document.getSubject(),
                        document.getTopic(),
                        document.getChapter(),
                        document.getTags()
                )
        );
    }
}