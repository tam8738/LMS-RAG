package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.enums.PublicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Lấy tài liệu của một teacher
    Page<Document> findByUploadedByIdOrderByCreatedAtDesc(Long uploadedById, Pageable pageable);

    // Lấy chi tiết tài liệu của teacher
    Optional<Document> findByIdAndUploadedById(Long id, Long uploadedById);

    // Lấy tài liệu PUBLISHED cho Library
    Page<Document> findByPublicationStatusOrderByPublishedAtDesc(PublicationStatus status, Pageable pageable);

    // Lấy tài liệu PUBLISHED theo ID
    Optional<Document> findByIdAndPublicationStatus(Long id, PublicationStatus status);

    // Admin: lấy danh sách chờ duyệt
    List<Document> findByPublicationStatusOrderByUpdatedAtAsc(PublicationStatus status);

    // Library filter with full-text search and metadata filters.
    // Native query is used to leverage PostgreSQL ILIKE and jsonb @> operator.
    @Query(value = """
        SELECT * FROM documents d
        WHERE d.publication_status = :status
          AND (:subject IS NULL OR d.subject = :subject)
          AND (:topic IS NULL OR d.topic ILIKE CONCAT('%', :topic, '%'))
          AND (:chapter IS NULL OR d.chapter ILIKE CONCAT('%', :chapter, '%'))
          AND (:q IS NULL OR d.title ILIKE CONCAT('%', :q, '%')
                          OR d.description ILIKE CONCAT('%', :q, '%')
                          OR d.subject ILIKE CONCAT('%', :q, '%')
                          OR d.topic ILIKE CONCAT('%', :q, '%')
                          OR d.chapter ILIKE CONCAT('%', :q, '%'))
          AND (:uploadedBy IS NULL OR d.uploaded_by = :uploadedBy)
          AND (:tags IS NULL OR d.tags @> CAST(:tags AS jsonb))
        ORDER BY d.published_at DESC
        """, nativeQuery = true)
    Page<Document> findLibraryDocuments(
            @Param("status") String status,
            @Param("subject") String subject,
            @Param("topic") String topic,
            @Param("chapter") String chapter,
            @Param("q") String q,
            @Param("uploadedBy") Long uploadedBy,
            @Param("tags") String tags,
            Pageable pageable
    );
}