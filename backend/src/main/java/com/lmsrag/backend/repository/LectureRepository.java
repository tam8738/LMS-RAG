package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.Lecture;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho Lecture.
 * Dùng @EntityGraph để JOIN FETCH course, tránh N+1 query.
 */
public interface LectureRepository extends JpaRepository<Lecture, Long> {

    /**
     * Lấy danh sách lecture theo courseId, sắp xếp theo orderIndex.
     * @EntityGraph(attributePaths = "course") bảo Hibernate lấy Course trong cùng 1 query.
     * Không có EntityGraph, mỗi lecture.getCourse() sẽ sinh ra 1 SELECT riêng (N+1).
     */
    @EntityGraph(attributePaths = "course")
    List<Lecture> findByCourseIdOrderByOrderIndexAsc(Long courseId);

    /**
     * Tìm lecture theo id kèm course (tránh N+1 khi xem chi tiết).
     */
    @EntityGraph(attributePaths = "course")
    Optional<Lecture> findById(Long id);

    boolean existsByIdAndCourseId(Long lectureId, Long courseId);
}
