package com.lmsrag.backend.dto.ai;

import java.util.List;

public record AiDocumentMetadata(
        String subject,
        String topic,
        String chapter,
        List<String> tags
) {
}
