package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.Quiz;
import com.lmsrag.backend.enums.QuizStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Cung cấp các thao tác truy cập dữ liệu cho quiz và quyền sở hữu tương ứng.
 */
@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {

    @EntityGraph(attributePaths = {"document", "createdBy"})
    Page<Quiz> findByCreatedById(Long createdById, Pageable pageable);

    @EntityGraph(attributePaths = {"document", "createdBy"})
    Page<Quiz> findByCreatedByIdAndStatus(Long createdById, QuizStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"document", "createdBy"})
    @Query("""
            SELECT quiz
            FROM Quiz quiz
            WHERE quiz.createdBy.id = :createdById
              AND (LOWER(quiz.title) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(COALESCE(quiz.description, '')) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    Page<Quiz> searchByCreatedByIdAndQuery(
            @Param("createdById") Long createdById,
            @Param("query") String query,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"document", "createdBy"})
    @Query("""
            SELECT quiz
            FROM Quiz quiz
            WHERE quiz.createdBy.id = :createdById
              AND quiz.status = :status
              AND (LOWER(quiz.title) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(COALESCE(quiz.description, '')) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    Page<Quiz> searchByCreatedByIdAndStatusAndQuery(
            @Param("createdById") Long createdById,
            @Param("status") QuizStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    Optional<Quiz> findByIdAndCreatedById(Long id, Long createdById);
}
