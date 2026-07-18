package com.lmsrag.backend.dto.rag;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Response DTO cho một message trong RAG conversation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagMessageResponse {

    /** ID của message. */
    private Long id;

    /** Vai trò: user hoặc assistant. */
    private String role;

    /** Nội dung message. */
    private String content;

    /** Đánh dấu assistant không tìm thấy context. */
    private Boolean notFound;

    /** Danh sách citation đính kèm. */
    @Builder.Default
    private List<RagCitation> citations = new ArrayList<>();

    /** Số token AI sử dụng (chỉ có ý nghĩa với assistant). */
    private Integer tokensUsed;

    /** ThờI điểm message được tạo. */
    private Instant createdAt;
}
