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

    // Library filter
    @Query("""
        SELECT d FROM Document d
        WHERE d.publicationStatus = :status
          AND (:subject IS NULL OR d.subject = :subject)
          AND (:topic IS NULL OR LOWER(d.topic) LIKE LOWER(CONCAT('%', :topic, '%')))
          AND (:chapter IS NULL OR LOWER(d.chapter) LIKE LOWER(CONCAT('%', :chapter, '%')))
        ORDER BY d.publishedAt DESC
        """)
    Page<Document> findLibraryDocuments(
            @Param("status") PublicationStatus status,
            @Param("subject") String subject,
            @Param("topic") String topic,
            @Param("chapter") String chapter,
            Pageable pageable
    );
}