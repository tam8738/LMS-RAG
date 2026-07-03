package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho Course.
 * Dùng @EntityGraph để JOIN FETCH createdBy, tránh N+1 query.
 */
public interface CourseRepository extends JpaRepository<Course, Long> {

    Optional<Course> findByCourseCode(String courseCode);

    /**
     * Lấy course do user tạo, kèm thông tin createdBy trong 1 query.
     * Tránh N+1 khi CourseMapper.toResponse truy cập course.getCreatedBy().getName().
     */
    @EntityGraph(attributePaths = "createdBy")
    List<Course> findByCreatedById(Long userId);

    boolean existsByCourseCode(String courseCode);
}
