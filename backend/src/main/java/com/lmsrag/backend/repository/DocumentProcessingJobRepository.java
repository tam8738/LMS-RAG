package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.enums.AiProcessingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentProcessingJobRepository extends JpaRepository<DocumentProcessingJob, Long> {

    /**
     * Lấy tất cả các job xử lý của một document, sắp xếp từ mới đến cũ.
     */
    List<DocumentProcessingJob> findByDocumentIdOrderByCreatedAtDesc(Long documentId);

    /**
     * Kiểm tra document có job đang ở trạng thái cụ thể hay không.
     * Dùng để ngăn chặn 2 job PROCESSING cùng lúc trên một document.
     */
    boolean existsByDocumentIdAndStatus(Long documentId, AiProcessingStatus status);

    /**
     * Lấy job xử lý mới nhất của một document.
     */
    Optional<DocumentProcessingJob> findFirstByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
