package com.lmsrag.backend.enums;

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
     * AI analyze xong, tài liệu đủ điều kiện để teacher submit review.
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
