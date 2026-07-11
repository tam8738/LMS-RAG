package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.DocumentMapper;
import com.lmsrag.backend.repository.DocumentProcessingJobRepository;
import com.lmsrag.backend.repository.DocumentRepository;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    private final DocumentRepository documentRepository;
    private final DocumentProcessingJobRepository documentProcessingJobRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

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

    // ===== UPLOAD =====
    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, DocumentCreateRequest metadata) {
        log.info("[UPLOAD] Bắt đầu upload document | fileName={} | fileSize={} bytes | contentType={}",
                file != null ? file.getOriginalFilename() : "null",
                file != null ? file.getSize() : 0,
                file != null ? file.getContentType() : "null");

        if (metadata != null) {
            log.info("[UPLOAD] Metadata received | title={} | subject={} | topic={} | chapter={} | tags={}",
                    metadata.getTitle(), metadata.getSubject(), metadata.getTopic(),
                    metadata.getChapter(), metadata.getTags());
        } else {
            log.warn("[UPLOAD] Metadata is null");
        }

        // Validate cả file và metadata phải có
        validateUploadRequest(file, metadata);
        log.info("[UPLOAD] Validate file và metadata thành công");

        User currentUser = getCurrentUser();
        log.info("[UPLOAD] User hiện tại | userId={} | email={} | role={}",
                currentUser.getId(), currentUser.getEmail(), currentUser.getRole());

        requireTeacher(currentUser);
        log.info("[UPLOAD] User {} là TEACHER, được phép upload", currentUser.getEmail());

        String extension = storageService.getFileExtension(file.getOriginalFilename());
        String tempStorageKey = "documents/temp-" + java.util.UUID.randomUUID() + "/v1/source." + extension;

        // Tạo Document entity với đầy đủ file info trước khi save
        // (IDENTITY strategy insert ngay lập tức để lấy id)
        Document document = Document.builder()
                .uploadedBy(currentUser)
                .title(metadata.getTitle())
                .description(metadata.getDescription())
                .subject(metadata.getSubject())
                .topic(metadata.getTopic())
                .chapter(metadata.getChapter())
                .tags(metadata.getTags() != null ? metadata.getTags() : List.of())
                .originalFilename(file.getOriginalFilename())
                .storedFilename("source." + extension)
                .storageKey(tempStorageKey)
                .fileVersion(1)
                .fileType(storageService.resolveFileType(file.getOriginalFilename()))
                .mimeType(file.getContentType())
                .fileSize(file.getSize())
                .processingStatus(ProcessingStatus.UPLOADED)
                .publicationStatus(PublicationStatus.DRAFT)
                .build();

        Document saved = documentRepository.save(document);
        log.info("[UPLOAD] Đã tạo Document | documentId={} | uploadedBy={}",
                saved.getId(), currentUser.getEmail());

        try {
            // Lưu file vật lý
            log.info("[UPLOAD] Bắt đầu lưu file vật lý | documentId={} | version={}",
                    saved.getId(), saved.getFileVersion());
            String storageKey = storageService.store(file, saved.getId(), saved.getFileVersion());
            log.info("[UPLOAD] Lưu file thành công | documentId={} | storageKey={}",
                    saved.getId(), storageKey);

            // Cập nhật storage_key chính xác
            saved.setStorageKey(storageKey);
            log.info("[UPLOAD] Đã cập nhật storage_key | documentId={} | storageKey={}",
                    saved.getId(), storageKey);

            // Tạo processing job
            log.info("[UPLOAD] Tạo processing job | documentId={}", saved.getId());
            DocumentProcessingJob job = DocumentProcessingJob.builder()
                    .document(saved)
                    .status(ProcessingStatus.PROCESSING)
                    .startedAt(Instant.now())
                    .build();
            documentProcessingJobRepository.save(job);
            log.info("[UPLOAD] Đã tạo processing job | documentId={} | jobId={}",
                    saved.getId(), job.getId());

            saved.setProcessingStatus(ProcessingStatus.PROCESSING);
            Document result = documentRepository.save(saved);
            log.info("[UPLOAD] Hoàn tất upload | documentId={} | storageKey={} | status=PROCESSING",
                    result.getId(), result.getStorageKey());

            return DocumentMapper.toResponse(result);
        } catch (Exception e) {
            // Nếu có lỗi, xóa file đã lưu (nếu có) và ném lỗi
            log.error("[UPLOAD] Upload failed for document id={} | error={}", saved.getId(), e.getMessage(), e);
            storageService.delete(saved.getStorageKey());
            documentRepository.delete(saved);
            log.warn("[UPLOAD] Đã rollback document id={} khỏi database", saved.getId());
            throw e instanceof AppException appException ? appException : new AppException(ErrorCode.DOCUMENT_UPLOAD_FAILED);
        }
    }

    private void validateUploadRequest(MultipartFile file, DocumentCreateRequest metadata) {
        if (file == null || file.isEmpty()) {
            log.warn("[UPLOAD] Upload rejected: file is missing or empty");
            throw new AppException(ErrorCode.FILE_REQUIRED);
        }

        if (metadata == null) {
            log.warn("[UPLOAD] Upload rejected: metadata is missing");
            throw new AppException(ErrorCode.METADATA_REQUIRED);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            log.warn("[UPLOAD] Upload rejected: file size {} bytes exceeds 20MB", file.getSize());
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }

        log.info("[UPLOAD] Đang validate file | name={} | size={} | contentType={}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());
        storageService.validateFile(file);
    }

    private void requireTeacher(User user) {
        if (user.getRole() != UserRole.TEACHER) {
            log.warn("[UPLOAD] Upload rejected: user {} with role {} is not a TEACHER", user.getEmail(), user.getRole());
            throw new AppException(ErrorCode.UPLOAD_NOT_ALLOWED);
        }
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

        // Xóa file vật lý trong storage
        storageService.delete(document.getStorageKey());
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
        if (isBlank(subject) && isBlank(topic) && isBlank(chapter)) {
            return documentRepository.findByPublicationStatusOrderByPublishedAtDesc(PublicationStatus.PUBLISHED, pageable)
                    .map(DocumentMapper::toResponse);
        }

        return documentRepository.findLibraryDocuments(
                PublicationStatus.PUBLISHED,
                normalizeFilter(subject),
                normalizeFilter(topic),
                normalizeFilter(chapter),
                pageable
        ).map(DocumentMapper::toResponse);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeFilter(String value) {
        return isBlank(value) ? null : value.trim();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getLibraryDocument(Long id) {
        Document document = documentRepository.findByIdAndPublicationStatus(id, PublicationStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
        return DocumentMapper.toResponse(document);
    }
}
