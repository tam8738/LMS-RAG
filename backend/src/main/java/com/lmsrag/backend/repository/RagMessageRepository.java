package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.RagMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository quản lý message trong RAG conversation ({@link RagMessage}).
 */
@Repository
public interface RagMessageRepository extends JpaRepository<RagMessage, Long> {

    /**
     * Lấy các message gần nhất của một conversation theo thứ tự thờI gian giảm dần (mới -> cũ).
     * Dùng Pageable để giớI hạn số lượng, ví dụ PageRequest.of(0, 6).
     */
    Page<RagMessage> findByConversationIdOrderByCreatedAtDescIdDesc(Long conversationId, Pageable pageable);

    /**
     * Đếm số message trong một conversation.
     */
    long countByConversationId(Long conversationId);

    /**
     * Xóa toàn bộ message của một conversation (clear history).
     */
    @Modifying
    @Query("DELETE FROM RagMessage m WHERE m.conversation.id = :conversationId")
    int deleteByConversationId(@Param("conversationId") Long conversationId);

    /**
     * Lấy N message gần nhất trước một thờI điểm nhất định.
     * Dùng để lấy history gửI sang AI Service (tối đa 6 messages).
     */
    @Query("""
        SELECT m FROM RagMessage m
        WHERE m.conversation.id = :conversationId
          AND m.createdAt < :before
          AND m.errorCode IS NULL
        ORDER BY m.createdAt DESC
        """)
    List<RagMessage> findRecentMessagesBefore(
            @Param("conversationId") Long conversationId,
            @Param("before") java.time.Instant before,
            Pageable pageable
    );
}
