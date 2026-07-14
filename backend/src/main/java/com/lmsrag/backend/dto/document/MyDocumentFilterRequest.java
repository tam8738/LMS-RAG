package com.lmsrag.backend.dto.document;

import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import lombok.Data;

/**
 * DTO chứa các tham số lọc và tìm kiếm cho API lấy danh sách tài liệu cá nhân của teacher.
 *
 * <p>Tất cả các trường đều optional (không bắt buộc). Khi null hoặc blank,
 * điều kiện tương ứng sẽ không được áp dụng vào câu truy vấn.
 */
@Data
public class MyDocumentFilterRequest {

    /**
     * Từ khóa tìm kiếm tự do (full-text search).
     * Tìm trong: title, description, subject, topic, chapter.
     */
    private String q;

    /**
     * Lọc theo trạng thái AI xử lý của tài liệu.
     * Các giá trị hợp lệ: UPLOADED, ANALYZING, ANALYZED, PROCESSING, PROCESSED, FAILED.
     */
    private AiProcessingStatus processingStatus;

    /**
     * Lọc theo trạng thái công bố của tài liệu.
     * Các giá trị hợp lệ: DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED.
     */
    private PublicationStatus publicationStatus;

    /**
     * Lọc theo môn học (khớp chính xác, case-sensitive).
     */
    private String subject;

    /**
     * Lọc theo chủ đề (ILIKE, khớp một phần).
     */
    private String topic;

    /**
     * Lọc theo chương/phần (ILIKE, khớp một phần).
     */
    private String chapter;

    /**
     * Lọc theo danh sách tags, phân cách nhau bởi dấu phẩy.
     * Ví dụ: "database,normalization" → tìm tài liệu có chứa tất cả các tag này.
     */
    private String tags;
}
