package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.DocumentFileType;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.DocumentMapper;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    // Lấy user hiện tại từ JWT
    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    // Kiểm tra document tồn tại
    private Document requireDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
    }

    // Kiểm tra user là owner của document
    private void requireOwner(Document document, User user) {
        if (!document.getUploadedBy().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.DOCUMENT_ACCESS_DENIED);
        }
    }

    // ===== CREATE =====
    @Transactional
    public DocumentResponse createDocument(DocumentCreateRequest request) {
        User currentUser = getCurrentUser();

        Document document = Document.builder()
                .uploadedBy(currentUser)
                .title(request.getTitle())
                .description(request.getDescription())
                .subject(request.getSubject())
                .topic(request.getTopic())
                .chapter(request.getChapter())
                .tags(request.getTags() != null ? request.getTags() : List.of())

                // File info sẽ được cập nhật khi upload
                .originalFilename("")
                .storedFilename("")
                .storageKey("")
                .fileVersion(1)
                .fileType(DocumentFileType.PDF)
                .mimeType("")
                .fileSize(0L)

                .processingStatus(ProcessingStatus.UPLOADED)
                .publicationStatus(PublicationStatus.DRAFT)
                .build();

        Document saved = documentRepository.save(document);
        return DocumentMapper.toResponse(saved);
    }

    // ===== READ =====
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getMyDocuments(Pageable pageable) {
        User currentUser = getCurrentUser();
        return documentRepository.findByUploadedByIdOrderByCreatedAtDesc(currentUser.getId(), pageable)
                .map(DocumentMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public DocumentResponse getMyDocument(Long id) {
        User currentUser = getCurrentUser();
        Document document = requireDocument(id);
        requireOwner(document, currentUser);
        return DocumentMapper.toResponse(document);
    }

    // ===== UPDATE =====
    @Transactional
    public DocumentResponse updateDocument(Long id, DocumentUpdateRequest request) {
        User currentUser = getCurrentUser();
        Document document = requireDocument(id);
        requireOwner(document, currentUser);

        // Chỉ cho sửa khi DRAFT hoặc REJECTED
        if (document.getPublicationStatus() != PublicationStatus.DRAFT
                && document.getPublicationStatus() != PublicationStatus.REJECTED) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_EDITABLE);
        }

        if (request.getTitle() != null) {
            document.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            document.setDescription(request.getDescription());
        }
        if (request.getSubject() != null) {
            document.setSubject(request.getSubject());
        }
        if (request.getTopic() != null) {
            document.setTopic(request.getTopic());
        }
        if (request.getChapter() != null) {
            document.setChapter(request.getChapter());
        }
        if (request.getTags() != null) {
            document.setTags(request.getTags());
        }

        Document updated = documentRepository.save(document);
        return DocumentMapper.toResponse(updated);
    }

    // ===== DELETE =====
    @Transactional
    public void deleteDocument(Long id) {
        User currentUser = getCurrentUser();
        Document document = requireDocument(id);
        requireOwner(document, currentUser);

        // Chỉ cho xóa khi DRAFT hoặc REJECTED
        if (document.getPublicationStatus() != PublicationStatus.DRAFT
                && document.getPublicationStatus() != PublicationStatus.REJECTED) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_DELETABLE);
        }

        // TODO: Xóa file vật lý trong storage
        documentRepository.delete(document);
    }

    // ===== SUBMIT REVIEW =====
    @Transactional
    public DocumentResponse submitReview(Long id) {
        User currentUser = getCurrentUser();
        Document document = requireDocument(id);
        requireOwner(document, currentUser);

        if (document.getProcessingStatus() != ProcessingStatus.PROCESSED) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_PROCESSED);
        }

        if (document.getPublicationStatus() != PublicationStatus.DRAFT
                && document.getPublicationStatus() != PublicationStatus.REJECTED) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_SUBMIT);
        }

        document.setPublicationStatus(PublicationStatus.PENDING_REVIEW);
        document.setRejectionReason(null);

        return DocumentMapper.toResponse(documentRepository.save(document));
    }

    // ===== ADMIN REVIEW =====
    @Transactional(readOnly = true)
    public List<DocumentResponse> getReviewQueue() {
        return documentRepository.findByPublicationStatusOrderByUpdatedAtAsc(PublicationStatus.PENDING_REVIEW)
                .stream()
                .map(DocumentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getReviewDetail(Long id) {
        Document document = documentRepository.findByIdAndPublicationStatus(id, PublicationStatus.PENDING_REVIEW)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
        return DocumentMapper.toResponse(document);
    }

    @Transactional
    public DocumentResponse approveReview(Long id) {
        User admin = getCurrentUser();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        if (document.getPublicationStatus() != PublicationStatus.PENDING_REVIEW) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_APPROVE);
        }

        document.setPublicationStatus(PublicationStatus.PUBLISHED);
        document.setReviewedBy(admin);
        document.setReviewedAt(Instant.now());
        document.setPublishedAt(Instant.now());

        return DocumentMapper.toResponse(documentRepository.save(document));
    }

    @Transactional
    public DocumentResponse rejectReview(Long id, String reason) {
        User admin = getCurrentUser();
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        if (document.getPublicationStatus() != PublicationStatus.PENDING_REVIEW) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_REJECT);
        }

        if (reason == null || reason.isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        document.setPublicationStatus(PublicationStatus.REJECTED);
        document.setReviewedBy(admin);
        document.setReviewedAt(Instant.now());
        document.setRejectionReason(reason);

        return DocumentMapper.toResponse(documentRepository.save(document));
    }

    @Transactional
    public DocumentResponse archiveDocument(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        if (document.getPublicationStatus() != PublicationStatus.PUBLISHED) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_ARCHIVE);
        }

        document.setPublicationStatus(PublicationStatus.ARCHIVED);

        return DocumentMapper.toResponse(documentRepository.save(document));
    }

    // ===== LIBRARY =====
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getLibraryDocuments(String subject, String topic, String chapter, Pageable pageable) {
        return documentRepository.findLibraryDocuments(
                PublicationStatus.PUBLISHED, subject, topic, chapter, pageable
        ).map(DocumentMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public DocumentResponse getLibraryDocument(Long id) {
        Document document = documentRepository.findByIdAndPublicationStatus(id, PublicationStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
        return DocumentMapper.toResponse(document);
    }
}