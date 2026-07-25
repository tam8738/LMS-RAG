package com.lmsrag.backend.event;

import com.lmsrag.backend.enums.PublicationStatus;

/**
 * Event được phát khi Admin hoàn tất kiểm duyệt tài liệu (approve hoặc reject).
 * Listener sẽ gửi email thông báo cho giảng viên đã upload tài liệu.
 */
public record DocumentReviewCompletedEvent(
        Long documentId,
        String documentTitle,
        String teacherEmail,
        String teacherName,
        PublicationStatus status,
        String rejectionReason,
        String reviewerName
) {
}
