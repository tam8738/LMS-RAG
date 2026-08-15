package com.lmsrag.backend.enums;

/**
 * Các trạng thái xử lý của tài liệu trong chuỗi tác vụ AI.
 */

public enum AiProcessingStatus {

    /**
     * Tài liệu vừa được upload thành công, chưa gửi đi analyze.
     */
    UPLOADED,

    /**
     * BE đang gọi AI Service để analyze tài liệu (đánh giá khả năng RAG).
     */
    ANALYZING,

    /**
     * Quá trình analyze đã hoàn tất (thành công hoặc thất bại). Tài liệu có thể submit review.
     * Khả năng RAG thực tế được thể hiện qua ragEligible và errorCode/errorMessage.
     */
    ANALYZED,

    /**
     * Sau khi admin approve, BE đang gọi AI Service để index RAG (chunk + embed).
     */
    PROCESSING,

    /**
     * AI index RAG xong, tài liệu sẵn sàng cho hỏi đáp/gen quiz.
     */
    PROCESSED,

    /**
     * Xử lý thất bại (analyze hoặc index).
     */
    FAILED
}
