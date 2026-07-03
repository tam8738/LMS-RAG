package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.CourseMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho CourseMember (quan hệ Student-Course).
 */
public interface CourseMemberRepository extends JpaRepository<CourseMember, Long> {

    /**
     * Lấy danh sách membership của một user.
     * Dùng cho Student xem course đã tham gia.
     */
    List<CourseMember> findByUserId(Long userId);

    /**
     * Kiểm tra user đã join course chưa.
     * Dùng trước khi cho join để tránh duplicate.
     */
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);

    /**
     * Tìm membership cụ thể (có thể dùng sau này để leave course).
     */
    Optional<CourseMember> findByUserIdAndCourseId(Long userId, Long courseId);
}