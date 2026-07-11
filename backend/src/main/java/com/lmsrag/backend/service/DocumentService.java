package com.lmsrag.backend.service;

import com.lmsrag.backend.client.ai.AiServiceClient;
import com.lmsrag.backend.client.ai.AiServiceException;
import com.lmsrag.backend.dto.ai.AiAnalyzeDocumentResult;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.ProcessingJobType;
import com.lmsrag.backend.enums.ProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.enums.RagStatus;
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
    private final AiServiceClient aiServiceClient;

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

            // Tạo analyze job và gọi AI Service analyze nhẹ sau khi file đã nằm trong shared storage.
            log.info("[UPLOAD] Tạo analyze job | documentId={}", saved.getId());
            saved.setProcessingStatus(ProcessingStatus.ANALYZING);
            saved.setRagStatus(RagStatus.NOT_ANALYZED);
            DocumentProcessingJob job = DocumentProcessingJob.builder()
                    .document(saved)
                    .jobType(ProcessingJobType.ANALYZE)
                    .status(ProcessingStatus.PROCESSING)
                    .startedAt(Instant.now())
                    .build();
            documentProcessingJobRepository.save(job);
            documentRepository.save(saved);
            log.info("[UPLOAD] Đã tạo analyze job | documentId={} | jobId={}",
                    saved.getId(), job.getId());

            try {
                AiAnalyzeDocumentResult analyzeResult = aiServiceClient.analyzeDocument(saved);
                applyAnalyzeSuccess(saved, job, analyzeResult);
            } catch (AiServiceException e) {
                applyAnalyzeFailure(saved, job, e.getErrorCode(), e.getMessage());
            }

            Document result = documentRepository.save(saved);
            documentProcessingJobRepository.save(job);
            log.info("[UPLOAD] Hoàn tất upload/analyze | documentId={} | storageKey={} | processingStatus={} | ragStatus={}",
                    result.getId(), result.getStorageKey(), result.getProcessingStatus(), result.getRagStatus());

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

    private void applyAnalyzeSuccess(
            Document document,
            DocumentProcessingJob job,
            AiAnalyzeDocumentResult result) {
        Instant now = Instant.now();
        RagStatus ragStatus = parseRagStatus(result.getRagStatus());

        document.setProcessingStatus(ProcessingStatus.PROCESSED);
        document.setProcessedAt(now);
        document.setRagStatus(ragStatus);
        document.setPageCount(result.getPageCount());
        document.setEstimatedTokenCount(result.getEstimatedTokenCount());
        document.setEstimatedChunkCount(result.getEstimatedChunkCount());
        document.setUnsupportedReason(result.getUnsupportedReason());
        document.setAnalyzedAt(now);
        document.setErrorCode(null);
        document.setErrorMessage(null);
        document.setAnalysisErrorCode(null);
        document.setAnalysisErrorMessage(null);

        job.setStatus(ProcessingStatus.PROCESSED);
        job.setChunkCount(result.getEstimatedChunkCount());
        job.setCompletedAt(now);
        job.setErrorCode(null);
        job.setErrorMessage(null);
    }

    private void applyAnalyzeFailure(
            Document document,
            DocumentProcessingJob job,
            String errorCode,
            String errorMessage) {
        Instant now = Instant.now();
        document.setProcessingStatus(ProcessingStatus.FAILED);
        document.setRagStatus(RagStatus.FAILED);
        document.setErrorCode(errorCode);
        document.setErrorMessage(errorMessage);
        document.setAnalysisErrorCode(errorCode);
        document.setAnalysisErrorMessage(errorMessage);
        document.setAnalyzedAt(now);

        job.setStatus(ProcessingStatus.FAILED);
        job.setErrorCode(errorCode);
        job.setErrorMessage(errorMessage);
        job.setCompletedAt(now);
    }

    private RagStatus parseRagStatus(String value) {
        try {
            return RagStatus.valueOf(value);
        } catch (RuntimeException e) {
            throw new AiServiceException(
                    "AI_INVALID_RAG_STATUS",
                    "AI Service trả rag_status không hợp lệ: " + value,
                    e
            );
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
