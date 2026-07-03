package com.lmsrag.backend.dto.course;


import com.lmsrag.backend.enums.CourseStatus;
import lombok.Data;

import java.time.Instant;

/**
 * DTO trả về cho Frontend khi lấy thông tin course.
 * Không trả về entity trực tiếp (tránh lộ password, internal data, lazy loading issue).
 * Chỉ trả các field cần thiết cho UI.
 */
@Data
public class CourseResponseDTO {

    /** ID course, dùng Long theo contract thống nhất */
    private Long id;

    private String name;
    private String description;

    /** Mã lớp để Student join */
    private String courseCode;

    private CourseStatus status;

    /** ID người tạo, Frontend có thể dùng để kiểm tra quyền sở hữu */
    private Long createdById;

    private String createdByName;

    private Instant createdAt;
    private Instant updatedAt;
}