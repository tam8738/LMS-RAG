package com.lmsrag.backend.entity;

import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 150)
    private String subject;

    @Column(length = 255)
    private String topic;

    @Column(length = 100)
    private String chapter;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "file_version", nullable = false)
    @Builder.Default
    private Integer fileVersion = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 20)
    private DocumentFileType fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 30)
    @Builder.Default
    private ProcessingStatus processingStatus = ProcessingStatus.UPLOADED;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false, length = 30)
    @Builder.Default
    private PublicationStatus publicationStatus = PublicationStatus.DRAFT;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "processed_at")
    private Instant processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}