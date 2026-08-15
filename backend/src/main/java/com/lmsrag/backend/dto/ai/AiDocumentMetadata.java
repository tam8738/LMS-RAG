package com.lmsrag.backend.dto.ai;

import java.util.List;

/**
 * Metadata tài liệu được chuyển cho AI Service trong các tác vụ RAG.
 */

public record AiDocumentMetadata(
        String subject,
        String topic,
        String chapter,
        List<String> tags
) {
}
