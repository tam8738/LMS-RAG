package com.lmsrag.backend.dto.lecture;

import lombok.Data;

/**
 * DTO nhận từ Frontend khi tạo hoặc cập nhật lecture.
 * Chứa các field cần thiết, không có system field.
 */
@Data
public class LectureRequestDTO {

    /** Tiêu đề bài giảng */
    private String title;

    /** Nội dung bài giảng (text, markdown, html tùy FE) */
    private String content;

    /** Thứ tự hiển thị trong course */
    private Integer orderIndex;

    /** ID của course chứa lecture này */
    private Long courseId;
}
