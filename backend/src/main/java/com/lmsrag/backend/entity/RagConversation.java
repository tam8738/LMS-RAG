package com.lmsrag.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Cuộc hội thoại RAG được lưu trữ trên Backend.
 * MỗI cặp (user, document) có đúng một conversation mặc định trong v1.
 */
@Entity
@Table(
    name = "rag_conversations",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_rag_conversation_user_document",
            columnNames = {"user_id", "document_id"}
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User sở hữu conversation. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Document mà conversation đang thảo luận. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    /** Tiêu đề conversation (tùy chọn). */
    @Column(length = 255)
    private String title;

    /** Số lượng message hiện tại, dùng để hiển thị nhanh mà không cần đếm lại. */
    @Column(name = "message_count", nullable = false)
    @Builder.Default
    private Integer messageCount = 0;

    /** ThờI điểm message cuốI cùng được gửI. */
    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    /** Danh sách message thuộc conversation. */
    @OneToMany(mappedBy = "conversation", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RagMessage> messages = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Soft delete: đánh dấu conversation bị xóa/xóa lịch sử. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /**
     * Helper để thêm message vào conversation và cập nhật counters.
     */
    public void addMessage(RagMessage message) {
        messages.add(message);
        message.setConversation(this);
        this.messageCount = messages.size();
        this.lastMessageAt = message.getCreatedAt() != null ? message.getCreatedAt() : Instant.now();
    }

    /**
     * Helper để xóa toàn bộ messages (clear history) và reset counters.
     */
    public void clearMessages() {
        messages.clear();
        this.messageCount = 0;
        this.lastMessageAt = null;
    }
}
