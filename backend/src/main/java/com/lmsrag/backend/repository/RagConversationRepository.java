package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.RagConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

/**
 * Repository quản lý cuộc hội thoại RAG ({@link RagConversation}).
 * Mỗi cặp (user, document) có đúng một conversation trong v1.
 */
@Repository
public interface RagConversationRepository extends JpaRepository<RagConversation, Long> {

    /**
     * Tìm conversation theo user và document.
     *
     * @param userId    ID của user
     * @param documentId ID của document
     * @return Optional conversation
     */
    Optional<RagConversation> findByUserIdAndDocumentId(Long userId, Long documentId);

    /**
     * Kiểm tra conversation đã tồn tại cho cặp (user, document) chưa.
     */
    boolean existsByUserIdAndDocumentId(Long userId, Long documentId);

    /**
     * Lấy danh sách conversation của một user, sắp xếp theo message mới nhất.
     * Chỉ lấy conversation chưa bị soft delete.
     */
    Page<RagConversation> findByUserIdAndDeletedAtIsNullOrderByLastMessageAtDesc(Long userId, Pageable pageable);

    /**
     * Soft delete conversation bằng cách set deleted_at.
     */
    @Modifying
    @Query("UPDATE RagConversation c SET c.deletedAt = :now WHERE c.id = :id AND c.user.id = :userId")
    int softDeleteByIdAndUserId(@Param("id") Long id,
                                @Param("userId") Long userId,
                                @Param("now") Instant now);

    /**
     * Đếm số conversation của một user trên một document (bao gồm cả deleted).
     */
    long countByUserIdAndDocumentId(Long userId, Long documentId);
}
