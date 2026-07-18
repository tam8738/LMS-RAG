package com.lmsrag.backend.entity;

import com.lmsrag.backend.dto.rag.RagCitation;
import com.lmsrag.backend.enums.RagMessageRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Một message trong RAG conversation.
 * Có thể là câu hỏi của user hoặc câu trả lờI của assistant.
 */
@Entity
@Table(name = "rag_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RagMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Conversation chứa message này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private RagConversation conversation;

    /** Vai trò: user hoặc assistant. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RagMessageRole role;

    /** Nội dung message. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Đánh dấu assistant không tìm thấy context phù hợp. */
    @Column(name = "not_found", nullable = false)
    @Builder.Default
    private Boolean notFound = false;

    /** Danh sách citation đính kèm câu trả lờI (dạng JSONB). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "citations_json", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<RagCitation> citationsJson = new ArrayList<>();

    /** Số token AI sử dụng cho câu trả lờI. */
    @Column(name = "tokens_used", nullable = false)
    @Builder.Default
    private Integer tokensUsed = 0;

    /** Mã lỗi nếu message gặp lỗI (tùy chọn). */
    @Column(name = "error_code", length = 100)
    private String errorCode;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Helper kiểm tra message có phảI là user message không.
     */
    public boolean isUser() {
        return role == RagMessageRole.user;
    }

    /**
     * Helper kiểm tra message có phảI là assistant message không.
     */
    public boolean isAssistant() {
        return role == RagMessageRole.assistant;
    }
}
