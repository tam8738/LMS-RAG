package com.lmsrag.backend.enums;

/**
 * Trạng thái xử lý kỹ thuật của một tài liệu trong pipeline RAG.
 * <p>
 * Pipeline chuẩn:
 * <pre>
 * UPLOADED → ANALYZING → ANALYZED
 *                              ↓
 *                    Teacher submit review
 *                              ↓
 *                         PENDING_REVIEW
 *                              ↓
 *                    Admin approve → PUBLISHED + PROCESSING
 *                              ↓
 *                         PROCESSED (đã index RAG xong)
 *                              ↓
 *                         Hỏi RAG / Gen quiz
 *
 *         ↓ (bất kỳ bước nào)
 *      FAILED
 * </pre>
 */
public enum ProcessingStatus {

    /** Tài liệu vừa được upload thành công, chưa gửi đi analyze. */
    UPLOADED,

    /** BE đang gọi AI Service để analyze tài liệu (đánh giá khả năng RAG). */
    ANALYZING,

    /** AI analyze xong, tài liệu đủ điều kiện để teacher submit review. */
    ANALYZED,

    /** Sau khi admin approve, BE đang gọi AI Service để index RAG (chunk + embed). */
    PROCESSING,

    /** AI index RAG xong, tài liệu sẵn sàng cho hỏi đáp/gen quiz. */
    PROCESSED,

    /** Xử lý thất bại (analyze hoặc index). */
    FAILED
}
