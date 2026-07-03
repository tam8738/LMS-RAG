package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.lecture.LectureResponseDTO;
import com.lmsrag.backend.entity.Lecture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Mapper chuyển đổi Lecture entity → LectureResponseDTO.
 *
 * Tách riêng mapper để:
 * 1. Tránh duplicate code khi nhiều Service cần map lecture.
 * 2. Dễ bảo trì: thay đổi cách map chỉ sửa 1 chỗ.
 * 3. Null-safe: tránh NPE khi lecture.getCourse() = null.
 * 4. Giữ project đơn giản, không phụ thuộc MapStruct.
 */
@Slf4j
@Component
public class LectureMapper {

    /**
     * Chuyển Lecture entity sang DTO để trả về Frontend.
     *
     * @param lecture entity từ database (có thể null)
     * @return LectureResponseDTO hoặc null nếu input null
     */
    public LectureResponseDTO toResponse(Lecture lecture) {
        if (lecture == null) {
            log.warn("[LectureMapper] Input lecture = NULL, trả về null");
            return null;
        }

        LectureResponseDTO dto = new LectureResponseDTO();
        dto.setId(lecture.getId());
        dto.setTitle(lecture.getTitle());
        dto.setContent(lecture.getContent());
        dto.setOrderIndex(lecture.getOrderIndex());

        // Null-safe cho relationship course
        if (lecture.getCourse() != null) {
            dto.setCourseId(lecture.getCourse().getId());
            dto.setCourseName(lecture.getCourse().getName());
        } else {
            log.warn("[LectureMapper] lecture id={} có course = NULL", lecture.getId());
            dto.setCourseId(null);
            dto.setCourseName("Unknown");
        }

        dto.setCreatedAt(lecture.getCreatedAt());
        dto.setUpdatedAt(lecture.getUpdatedAt());
        return dto;
    }
}
