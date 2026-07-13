package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.entity.DocumentProcessingJob;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.ProcessingJobType;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
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
    private final AiValidationService aiValidationService;
    private final AiIndexService aiIndexService;

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
                .processingStatus(AiProcessingStatus.UPLOADED)
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

            // Tạo analyze job và gọi AI Service bất đồng bộ
            log.info("[UPLOAD] Tạo analyze job | documentId={}", saved.getId());
            DocumentProcessingJob job = DocumentProcessingJob.builder()
                    .document(saved)
                    .jobType(ProcessingJobType.ANALYZE)
                    .status(AiProcessingStatus.ANALYZING)
                    .startedAt(Instant.now())
                    .build();
            documentProcessingJobRepository.save(job);
            log.info("[UPLOAD] Đã tạo analyze job | documentId={} | jobId={}",
                    saved.getId(), job.getId());

            Document result = documentRepository.save(saved);
            log.info("[UPLOAD] Hoàn tất upload | documentId={} | storageKey={} | status=UPLOADED",
                    result.getId(), result.getStorageKey());

            // Sau khi upload transaction commit, chuyển sang ANALYZING rồi fire-and-forget gọi AI Service.
            Long resultId = result.getId();
            Long jobId = job.getId();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    Document freshDoc = documentRepository.findById(resultId).orElse(null);
                    DocumentProcessingJob freshJob = documentProcessingJobRepository.findById(jobId).orElse(null);
                    if (freshDoc != null && freshJob != null) {
                        aiValidationService.startAnalysis(freshDoc, freshJob);
                    } else {
                        log.warn("[UPLOAD] Không tìm thấy document/job sau commit để gọi AI validation | documentId={} | jobId={}",
                                resultId, jobId);
                    }
                }
            });

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
    public DocumentResponse updateDocument(Long id, DocumentUpdateRequest request, MultipartFile file) {
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

        boolean fileReplaced = false;
        if (file != null && !file.isEmpty()) {
            replaceDocumentFile(document, file);
            fileReplaced = true;
        }

        Document updated = documentRepository.save(document);

        if (fileReplaced) {
            DocumentProcessingJob job = createAnalyzeJob(updated);
            scheduleAnalysisAfterCommit(updated, job);
        }

        return DocumentMapper.toResponse(updated);
    }

    private void replaceDocumentFile(Document document, MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }
        storageService.validateFile(file);

        String oldStorageKey = document.getStorageKey();
        String extension = storageService.getFileExtension(file.getOriginalFilename());
        int newVersion = document.getFileVersion() + 1;

        String newStorageKey = storageService.store(file, document.getId(), newVersion);

        document.setOriginalFilename(file.getOriginalFilename());
        document.setStoredFilename("source." + extension);
        document.setStorageKey(newStorageKey);
        document.setFileVersion(newVersion);
        document.setFileType(storageService.resolveFileType(file.getOriginalFilename()));
        document.setMimeType(file.getContentType());
        document.setFileSize(file.getSize());

        // File thay đổi -> cần analyze lại
        document.setProcessingStatus(AiProcessingStatus.UPLOADED);
        document.setProcessedAt(null);
        document.setRagEligible(null);
        document.setPageCount(null);
        document.setEstimatedTokenCount(null);
        document.setEstimatedChunkCount(null);
        document.setUnsupportedReason(null);
        document.setAnalyzedAt(null);
        document.setErrorCode(null);
        document.setErrorMessage(null);

        // Xóa file cũ sau khi đã lưu file mới thành công
        try {
            storageService.delete(oldStorageKey);
        } catch (Exception e) {
            log.warn("[UPDATE] Xóa file cũ thất bại | documentId={} | oldStorageKey={} | error={}",
                    document.getId(), oldStorageKey, e.getMessage());
        }

        log.info("[UPDATE] Đã thay thế file | documentId={} | version={} | storageKey={}",
                document.getId(), newVersion, newStorageKey);
    }

    private DocumentProcessingJob createAnalyzeJob(Document document) {
        DocumentProcessingJob job = DocumentProcessingJob.builder()
                .document(document)
                .jobType(ProcessingJobType.ANALYZE)
                .status(AiProcessingStatus.ANALYZING)
                .startedAt(Instant.now())
                .build();
        return documentProcessingJobRepository.save(job);
    }

    private void scheduleAnalysisAfterCommit(Document document, DocumentProcessingJob job) {
        Long documentId = document.getId();
        Long jobId = job.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                Document freshDoc = documentRepository.findById(documentId).orElse(null);
                DocumentProcessingJob freshJob = documentProcessingJobRepository.findById(jobId).orElse(null);
                if (freshDoc != null && freshJob != null) {
                    aiValidationService.startAnalysis(freshDoc, freshJob);
                } else {
                    log.warn("[UPDATE] Không tìm thấy document/job sau commit để gọi AI validation | documentId={} | jobId={}",
                            documentId, jobId);
                }
            }
        });
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

        if (document.getProcessingStatus() != AiProcessingStatus.ANALYZED) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_ANALYZED);
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

        Document approved = documentRepository.save(document);

        // Sau khi approve và publish, nếu tài liệu đủ điều kiện RAG thì bắt đầu index bất đồng bộ.
        if (Boolean.TRUE.equals(approved.getRagEligible())) {
            startRagIndexJob(approved);
        }

        return DocumentMapper.toResponse(approved);
    }

    /**
     * Tạo một index job mới và fire-and-forget gọi AI Service index RAG.
     * Dùng chung cho approve và retry/reprocess.
     */
    private void startRagIndexJob(Document document) {
        Long documentId = document.getId();
        DocumentProcessingJob indexJob = DocumentProcessingJob.builder()
                .document(document)
                .jobType(ProcessingJobType.INDEX)
                .status(AiProcessingStatus.PROCESSING)
                .startedAt(Instant.now())
                .build();
        documentProcessingJobRepository.save(indexJob);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                Document freshDoc = documentRepository.findById(documentId).orElse(null);
                DocumentProcessingJob freshJob = documentProcessingJobRepository.findById(indexJob.getId()).orElse(null);
                if (freshDoc != null && freshJob != null) {
                    aiIndexService.startIndex(freshDoc, freshJob);
                } else {
                    log.warn("[RAG] Không tìm thấy document/job sau commit để gọi index RAG | documentId={}",
                            documentId);
                }
            }
        });
    }

    /**
     * Admin yêu cầu xử lý lại RAG cho tài liệu đã publish.
     * Cho phép khi document PUBLISHED và đang ở trạng thái FAILED hoặc trước đó chưa index thành công.
     */
    @Transactional
    public DocumentResponse reprocessRag(Long documentId) {
        getCurrentUser(); // đảm bảo admin đã đăng nhập (phân quyền ở controller/security)
        Document document = requireDocument(documentId);

        if (document.getPublicationStatus() != PublicationStatus.PUBLISHED) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_REPROCESS_RAG);
        }

        if (!Boolean.TRUE.equals(document.getRagEligible())) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_REPROCESS_RAG);
        }

        // Chỉ cho phép reprocess khi đang failed hoặc chưa processed (tránh reprocess khi đang chạy)
        if (document.getProcessingStatus() != AiProcessingStatus.FAILED
                && document.getProcessingStatus() != AiProcessingStatus.ANALYZED
                && document.getProcessingStatus() != AiProcessingStatus.PROCESSED) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_REPROCESS_RAG);
        }

        // Reset trạng thái để chờ index mới
        document.setProcessingStatus(AiProcessingStatus.ANALYZED);
        document.setErrorCode(null);
        document.setErrorMessage(null);
        documentRepository.save(document);

        startRagIndexJob(document);

        log.info("[RAG] Admin yêu cầu xử lý lại RAG | documentId={}", documentId);
        return DocumentMapper.toResponse(document);
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
    public Page<DocumentResponse> getLibraryDocuments(
            String subject,
            String topic,
            String chapter,
            String q,
            String tags,
            Long uploadedBy,
            Pageable pageable
    ) {
        boolean hasFilter = !isBlank(subject)
                || !isBlank(topic)
                || !isBlank(chapter)
                || !isBlank(q)
                || !isBlank(tags)
                || uploadedBy != null;

        if (!hasFilter) {
            return documentRepository.findByPublicationStatusOrderByPublishedAtDesc(PublicationStatus.PUBLISHED, pageable)
                    .map(DocumentMapper::toResponse);
        }

        return documentRepository.findLibraryDocuments(
                PublicationStatus.PUBLISHED.name(),
                normalizeFilter(subject),
                normalizeFilter(topic),
                normalizeFilter(chapter),
                normalizeFilter(q),
                uploadedBy,
                normalizeTags(tags),
                pageable
        ).map(DocumentMapper::toResponse);
    }

    private String normalizeTags(String tags) {
        if (isBlank(tags)) {
            return null;
        }
        // Accept comma-separated tags, e.g. "database,normalization" -> '["database","normalization"]'
        String[] parts = tags.split(",");
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(parts[i].trim().replace("\"", "\\\"")).append("\"");
        }
        sb.append("]");
        return sb.toString();
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
