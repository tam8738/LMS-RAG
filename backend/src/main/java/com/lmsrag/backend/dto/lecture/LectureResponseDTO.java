package com.lmsrag.backend.dto.lecture;

import lombok.Data;

import java.time.Instant;

/**
 * DTO trả về cho Frontend khi lấy thông tin lecture.
 * Không trả entity trực tiếp để tránh lazy loading và lộ dữ liệu.
 */
@Data
public class LectureResponseDTO {

    /** ID lecture */
    private Long id;

    private String title;
    private String content;

    /** Thứ tự trong course */
    private Integer orderIndex;

    /** ID course chứa lecture */
    private Long courseId;

    /** Tên course (để FE hiển thị breadcrumb) */
    private String courseName;

    private Instant createdAt;
    private Instant updatedAt;
}
