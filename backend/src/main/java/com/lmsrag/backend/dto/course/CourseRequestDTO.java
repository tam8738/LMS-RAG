package com.lmsrag.backend.dto.course;

import com.lmsrag.backend.enums.CourseStatus;
import lombok.Data;

/**
 * DTO nhận từ Frontend khi tạo hoặc cập nhật course.
 * Chỉ chứa các field cần thiết, không chứa id/system field (createdAt, updatedAt).
 * Dùng @Data của Lombok để tự sinh getter/setter/toString.
 */
@Data
public class CourseRequestDTO {

    /** Tên course, bắt buộc */
    private String name;

    /** Mô tả course, tùy chọn */
    private String description;

    /**
     * Trạng thái course.
     * Theo PRD và BE_AI_INTEGRATION_DECISIONS: ACTIVE/INACTIVE.
     * Nhưng entity hiện tại dùng PRIVATE/PUBLISH, giữ nguyên để không phá vỡ schema hiện có.
     */
    private CourseStatus status;
}