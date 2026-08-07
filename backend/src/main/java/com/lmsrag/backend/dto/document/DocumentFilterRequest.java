package com.lmsrag.backend.dto.document;

import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO chứa các tham số lọc và tìm kiếm tài liệu, dùng chung cho nhiều API.
 *
 * <p>Tất cả các trường đều optional (không bắt buộc). Khi null hoặc blank,
 * điều kiện tương ứng sẽ không được áp dụng vào câu truy vấn.
 *
 * <p><b>Cách dùng theo từng role:</b>
 * <ul>
 *   <li><b>Teacher</b> ({@code GET /my/documents}): service tự set {@code uploadedBy} từ
 *       current user, field này trong DTO bị bỏ qua.</li>
 *   <li><b>Admin</b> ({@code GET /admin/documents}): {@code uploadedBy} được dùng để lọc
 *       theo teacher; {@code publicationStatus = DRAFT} bị từ chối.</li>
 * </ul>
 */
@Data
public class DocumentFilterRequest {

    /**
     * Từ khóa tìm kiếm tự do (full-text search).
     * Tìm trong: title, description, subject, topic, chapter.
     * Với Admin, tìm thêm cả tên và email của teacher.
     */
    @Size(max = 200, message = "Từ khóa tìm kiếm tối đa 200 ký tự")
    private String q;

    /**
     * Lọc theo trạng thái AI xử lý của tài liệu.
     * Các giá trị hợp lệ: UPLOADED, ANALYZING, ANALYZED, PROCESSING, PROCESSED, FAILED.
     */
    private AiProcessingStatus processingStatus;

    /**
     * Lọc theo trạng thái công bố của tài liệu.
     * Teacher: chấp nhận mọi giá trị (DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED).
     * Admin: chỉ chấp nhận PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED (không được là DRAFT).
     */
    private PublicationStatus publicationStatus;

    /**
     * Lọc theo môn học (khớp chính xác, case-sensitive).
     */
    @Size(max = 150, message = "Subject tối đa 150 ký tự")
    private String subject;

    /**
     * Lọc theo chủ đề (ILIKE, khớp một phần).
     */
    @Size(max = 255, message = "Topic tối đa 255 ký tự")
    private String topic;

    /**
     * Lọc theo chương/phần (ILIKE, khớp một phần).
     */
    @Size(max = 100, message = "Chapter tối đa 100 ký tự")
    private String chapter;

    /**
     * Lọc theo danh sách tags, phân cách nhau bởi dấu phẩy.
     * Ví dụ: "database,normalization" → tìm tài liệu có chứa tất cả các tag này.
     */
    @Size(max = 1000, message = "Bộ lọc tags tối đa 1000 ký tự")
    private String tags;

    /**
     * Lọc theo ID của teacher đã upload.
     * Chỉ có ý nghĩa với Admin. Teacher: field này bị bỏ qua, service dùng current user ID.
     */
    @Positive(message = "Uploader ID phải là số nguyên dương")
    private Long uploadedBy;
}
