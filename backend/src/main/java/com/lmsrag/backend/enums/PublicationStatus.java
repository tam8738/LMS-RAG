package com.lmsrag.backend.enums;

/**
 * Trạng thái công bố/phê duyệt của tài liệu trong quy trình biên tập.
 * <p>
 * Quy trình chuẩn của teacher:
 * <pre>
 * DRAFT → PENDING_REVIEW → PUBLISHED
 *           ↓
 *        REJECTED → (sửa lại) → DRAFT
 * </pre>
 * <p>
 * Admin có thể archive tài liệu đã publish để ẩn khỏi thư viện.
 */
public enum PublicationStatus {

    /** Tài liệu đang soạn thảo, chỉ teacher sở hữu mới thấy và chỉnh sửa được. */
    DRAFT,

    /** Teacher đã gửi tài liệu đi duyệt, đang chờ admin xem xét. */
    PENDING_REVIEW,

    /** Admin đã duyệt và tài liệu đã được công bố ra thư viện. */
    PUBLISHED,

    /** Admin từ chối duyệt; teacher có thể sửa lại và gửi duyệt tiếp. */
    REJECTED,

    /** Tài liệu đã bị gỡ/xóa mềm khỏi thư viện (không còn hiển thị). */
    ARCHIVED
}
