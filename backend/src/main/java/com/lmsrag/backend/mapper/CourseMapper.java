package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.course.CourseResponseDTO;
import com.lmsrag.backend.entity.Course;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Mapper chuyển đổi Course entity → CourseResponseDTO.
 *
 * Tách riêng mapper để:
 * 1. Tránh duplicate code giữa các Service (CourseService, LectureService cũng cần map course).
 * 2. Dễ bảo trì: thay đổi cách map chỉ sửa 1 chỗ.
 * 3. Null-safe: tránh NullPointerException gây lỗi 500.
 * 4. Không phụ thuộc framework mapping phức tạp (MapStruct), giữ project đơn giản.
 */
@Slf4j
@Component
public class CourseMapper {

    /**
     * Chuyển Course entity sang DTO để trả về Frontend.
     *
     * @param course entity từ database (có thể null nếu query trả về null)
     * @return CourseResponseDTO hoặc null nếu input null
     */
    public CourseResponseDTO toResponse(Course course) {
        if (course == null) {
            log.warn("[CourseMapper] Input course = NULL, trả về null");
            return null;
        }

        CourseResponseDTO dto = new CourseResponseDTO();
        dto.setId(course.getId());
        dto.setName(course.getName());
        dto.setDescription(course.getDescription());
        dto.setCourseCode(course.getCourseCode());
        dto.setStatus(course.getStatus());

        // Null-safe cho relationship createdBy
        if (course.getCreatedBy() != null) {
            dto.setCreatedById(course.getCreatedBy().getId());
            dto.setCreatedByName(course.getCreatedBy().getName());
        } else {
            log.warn("[CourseMapper] course id={} có createdBy = NULL", course.getId());
            dto.setCreatedById(null);
            dto.setCreatedByName("Unknown");
        }

        dto.setCreatedAt(course.getCreatedAt());
        dto.setUpdatedAt(course.getUpdatedAt());
        return dto;
    }
}
