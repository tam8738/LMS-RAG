package com.lmsrag.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lmsrag.backend.entity.Document;

public record AiIndexDocumentRequest(
        @JsonProperty("document_id") Long documentId,
        @JsonProperty("storage_key") String storageKey,
        @JsonProperty("file_type") String fileType,
        Boolean reindex,
        AiDocumentMetadata metadata
) {
    public static AiIndexDocumentRequest from(Document document, boolean reindex) {
        return new AiIndexDocumentRequest(
                document.getId(),
                document.getStorageKey(),
                document.getFileType().name(),
                reindex,
                new AiDocumentMetadata(
                        document.getSubject(),
                        document.getTopic(),
                        document.getChapter(),
                        document.getTags()
                )
        );
    }
}