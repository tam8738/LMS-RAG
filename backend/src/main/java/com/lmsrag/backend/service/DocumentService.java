package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.dto.document.DocumentFilterRequest;
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
import com.lmsrag.backend.event.DocumentReviewCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
    private final ApplicationEventPublisher eventPublisher;

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

    // Kiểm tra document đã được teacher gửi duyệt (không phải DRAFT)
    // Dùng cho các API admin cần xác nhận quyền truy cập trước khi đọc chi tiết
    private Document requireNonDraftDocument(Long id) {
        return documentRepository.findById(id)
                .filter(doc -> doc.getPublicationStatus() != PublicationStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
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

    /**
     * Lấy danh sách tài liệu cá nhân của teacher đang đăng nhập với bộ lọc đa điều kiện.
     *
     * <p>Logic chọn query:
     * <ul>
     *   <li>Không có bộ lọc nào → dùng fast-path (simple index scan theo uploadedBy, sort theo createdAt DESC)</li>
     *   <li>Có ít nhất một bộ lọc → dùng native query với đầy đủ điều kiện WHERE</li>
     * </ul>
     *
     * @param filter   Bộ lọc (q, processingStatus, publicationStatus, subject, topic, chapter, tags)
     * @param pageable Thông tin phân trang và sắp xếp từ request (?page=0&size=20&sort=createdAt,desc)
     * @return Trang kết quả DocumentResponse đã được map
     */
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getMyDocuments(DocumentFilterRequest filter, Pageable pageable) {
        User currentUser = getCurrentUser();
        Long userId = currentUser.getId();

        log.info("[MY_DOCS] Lấy danh sách tài liệu | userId={} | email={} | filter={}",
                userId, currentUser.getEmail(), filter);

        // Fast-path: không có filter nào → dùng method derived query đơn giản hơn
        boolean hasFilter = !isBlank(filter.getQ())
                || filter.getProcessingStatus() != null
                || filter.getPublicationStatus() != null
                || !isBlank(filter.getSubject())
                || !isBlank(filter.getTopic())
                || !isBlank(filter.getChapter())
                || !isBlank(filter.getTags());

        if (!hasFilter) {
            log.debug("[MY_DOCS] Không có filter, dùng fast-path | userId={}", userId);
            return mapDocumentPage(documentRepository
                    .findByUploadedByIdOrderByCreatedAtDesc(userId, pageable));
        }

        // Full-filter path: truyền từng tham số vào native query
        // Các giá trị null sẽ bỏ qua điều kiện tương ứng trong SQL (IS NULL OR ...)
        String processingStatusStr = filter.getProcessingStatus() != null
                ? filter.getProcessingStatus().name()
                : null;

        String publicationStatusStr = filter.getPublicationStatus() != null
                ? filter.getPublicationStatus().name()
                : null;

        log.debug("[MY_DOCS] Dùng full-filter query | userId={} | q={} | processingStatus={} | publicationStatus={} | subject={} | topic={} | chapter={} | tags={}",
                userId,
                filter.getQ(),
                processingStatusStr,
                publicationStatusStr,
                filter.getSubject(),
                filter.getTopic(),
                filter.getChapter(),
                filter.getTags());

        return mapDocumentPage(documentRepository.findMyDocuments(
                userId,
                normalizeFilter(filter.getQ()),
                processingStatusStr,
                publicationStatusStr,
                normalizeFilter(filter.getSubject()),
                normalizeFilter(filter.getTopic()),
                normalizeFilter(filter.getChapter()),
                normalizeTags(filter.getTags()),
                toNativePageable(pageable)
        ));
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

        if (document.getPublicationStatus() == PublicationStatus.REJECTED) {
            resetRejectedDocumentForRevision(document);
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

    private void resetRejectedDocumentForRevision(Document document) {
        document.setPublicationStatus(PublicationStatus.DRAFT);
        document.setReviewedBy(null);
        document.setReviewedAt(null);
        document.setRejectionReason(null);
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

        if (document.getPublicationStatus() != PublicationStatus.DRAFT) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_SUBMIT);
        }

        document.setPublicationStatus(PublicationStatus.PENDING_REVIEW);
        document.setRejectionReason(null);

        return DocumentMapper.toResponse(documentRepository.save(document));
    }

    // ===== ADMIN DOCUMENTS =====

    /**
     * Lấy danh sách tài liệu dành cho Admin quản lý, có filter và phân trang.
     *
     * <p>Chỉ trả về các tài liệu mà teacher đã gửi duyệt (không bao gồm DRAFT).
     * Nếu client cố tình truyền {@code publicationStatus = DRAFT}, request sẽ bị từ chối.
     *
     * @param filter     Các điều kiện lọc (dùng chung {@link DocumentFilterRequest})
     * @param pageable   Thông tin phân trang và sắp xếp
     * @return Trang kết quả DocumentResponse khớp điều kiện
     */
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getAdminDocuments(DocumentFilterRequest filter, Pageable pageable) {
        // Admin không được phép lọc theo trạng thái DRAFT
        if (filter.getPublicationStatus() == PublicationStatus.DRAFT) {
            throw new AppException(ErrorCode.FORBIDDEN);
        }

        String processingStatusStr = filter.getProcessingStatus() != null
                ? filter.getProcessingStatus().name()
                : null;
        String publicationStatusStr = filter.getPublicationStatus() != null
                ? filter.getPublicationStatus().name()
                : null;

        return mapDocumentPage(documentRepository.findAdminDocuments(
                normalizeFilter(filter.getQ()),
                processingStatusStr,
                publicationStatusStr,
                normalizeFilter(filter.getSubject()),
                normalizeFilter(filter.getTopic()),
                normalizeFilter(filter.getChapter()),
                filter.getUploadedBy(),
                normalizeTags(filter.getTags()),
                toNativePageable(pageable)
        ));
    }

    /**
     * Lấy chi tiết một tài liệu dành cho Admin.
     *
     * <p>Chỉ trả về tài liệu mà teacher đã gửi duyệt (không bao gồm DRAFT).
     *
     * @param id ID của tài liệu cần xem
     * @return DocumentResponse nếu tài liệu tồn tại và không phải DRAFT
     * @throws AppException {@code DOCUMENT_NOT_FOUND} nếu không tìm thấy hoặc đang ở trạng thái DRAFT
     */
    @Transactional(readOnly = true)
    public DocumentResponse getAdminDocument(Long id) {
        return DocumentMapper.toResponse(requireNonDraftDocument(id));
    }

    // ===== ADMIN REVIEW QUEUE =====
    @Transactional(readOnly = true)
    public Page<DocumentResponse> getReviewQueue(String query, Pageable pageable) {
        return mapDocumentPage(documentRepository.findAdminDocuments(
                normalizeFilter(query),
                null,
                PublicationStatus.PENDING_REVIEW.name(),
                null,
                null,
                null,
                null,
                null,
                toNativePageable(pageable)
        ));
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

        publishReviewCompletedEvent(approved, PublicationStatus.PUBLISHED, null);

        return DocumentMapper.toResponse(approved);
    }

    private void publishReviewCompletedEvent(Document document, PublicationStatus status, String rejectionReason) {
        User owner = document.getUploadedBy();
        User reviewer = document.getReviewedBy();

        DocumentReviewCompletedEvent event = new DocumentReviewCompletedEvent(
                document.getId(),
                document.getTitle(),
                owner.getEmail(),
                owner.getName(),
                status,
                rejectionReason,
                reviewer != null ? reviewer.getName() : "Quản trị viên"
        );

        eventPublisher.publishEvent(event);
        log.info("[DOCUMENT_REVIEW] Published review notification event | documentId={} | status={} | teacherEmail={}",
                document.getId(), status, owner.getEmail());
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
     * Teacher yêu cầu xử lý lại RAG cho tài liệu của chính mình đã publish.
     * Chỉ cho phép khi document thuộc sở hữu của teacher đang đăng nhập, đã PUBLISHED
     * và đang ở trạng thái FAILED/ANALYZED/PROCESSED.
     */
    @Transactional
    public DocumentResponse reprocessRag(Long documentId) {
        User currentUser = getCurrentUser();
        Document document = requireDocument(documentId);
        requireOwner(document, currentUser);

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

        log.info("[RAG] Teacher yêu cầu xử lý lại RAG | documentId={} | userId={}", documentId, currentUser.getId());
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

        Document rejected = documentRepository.save(document);

        publishReviewCompletedEvent(rejected, PublicationStatus.REJECTED, reason);

        return DocumentMapper.toResponse(rejected);
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
            return mapDocumentPage(documentRepository.findByPublicationStatusOrderByPublishedAtDesc(
                    PublicationStatus.PUBLISHED,
                    pageable
            ));
        }

        return mapDocumentPage(documentRepository.findLibraryDocuments(
                PublicationStatus.PUBLISHED.name(),
                normalizeFilter(subject),
                normalizeFilter(topic),
                normalizeFilter(chapter),
                normalizeFilter(q),
                uploadedBy,
                normalizeTags(tags),
                toNativePageable(pageable)
        ));
    }

    /**
     * Loads all uploader/reviewer names for one page in a single query, then maps without
     * initializing one lazy User proxy per document.
     */
    private Page<DocumentResponse> mapDocumentPage(Page<Document> documents) {
        if (documents.isEmpty()) {
            return documents.map(DocumentMapper::toResponse);
        }

        Set<Long> userIds = new HashSet<>();
        for (Document document : documents.getContent()) {
            if (document.getUploadedBy() != null) {
                userIds.add(document.getUploadedBy().getId());
            }
            if (document.getReviewedBy() != null) {
                userIds.add(document.getReviewedBy().getId());
            }
        }

        Map<Long, String> namesById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getName));
        return documents.map(document -> DocumentMapper.toResponse(document, namesById));
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

    /**
     * Chuyển đổi Pageable sort từ tên entity property (camelCase) sang tên cột DB (snake_case)
     * để dùng với native query.
     */
    private Pageable toNativePageable(Pageable pageable) {
        if (!pageable.getSort().isSorted()) {
            return pageable;
        }

        Sort nativeSort = Sort.by(pageable.getSort().stream()
                .map(order -> {
                    String property = order.getProperty();
                    String nativeProperty = switch (property) {
                        case "createdAt" -> "created_at";
                        case "updatedAt" -> "updated_at";
                        case "processedAt" -> "processed_at";
                        case "analyzedAt" -> "analyzed_at";
                        case "reviewedAt" -> "reviewed_at";
                        case "publishedAt" -> "published_at";
                        case "fileSize" -> "file_size";
                        case "fileVersion" -> "file_version";
                        case "originalFilename" -> "original_filename";
                        case "storedFilename" -> "stored_filename";
                        case "storageKey" -> "storage_key";
                        case "mimeType" -> "mime_type";
                        case "errorCode" -> "error_code";
                        case "errorMessage" -> "error_message";
                        case "unsupportedReason" -> "unsupported_reason";
                        case "rejectionReason" -> "rejection_reason";
                        case "uploadedBy" -> "uploaded_by";
                        case "reviewedBy" -> "reviewed_by";
                        default -> property;
                    };
                    return order.isAscending()
                            ? Sort.Order.asc(nativeProperty)
                            : Sort.Order.desc(nativeProperty);
                })
                .toList());

        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), nativeSort);
    }

    @Transactional(readOnly = true)
    public DocumentResponse getLibraryDocument(Long id) {
        Document document = documentRepository.findByIdAndPublicationStatus(id, PublicationStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));
        return DocumentMapper.toResponse(document);
    }

    public record DocumentContent(Resource resource, String filename, String mimeType, long contentLength) {
    }

    /**
     * Trả về nội dung file của document theo phân quyền:
     * <ul>
     *   <li>Owner: xem được ở mọi trạng thái.</li>
     *   <li>Admin: xem được PUBLISHED và PENDING_REVIEW.</li>
     *   <li>Teacher khác / client (public): chỉ xem PUBLISHED.</li>
     * </ul>
     *
     * @param documentId ID của document
     * @param currentUser User đang đăng nhập, có thể null nếu public access
     * @return DocumentContent chứa resource, filename và mimeType
     */
    @Transactional(readOnly = true)
    public DocumentContent getDocumentContent(Long documentId, User currentUser) {
        Document document = requireDocument(documentId);

        if (!canViewDocumentContent(document, currentUser)) {
            throw new AppException(ErrorCode.DOCUMENT_ACCESS_DENIED);
        }

        log.info("[CONTENT] Xem nội dung document | documentId={} | userId={} | publicationStatus={}",
                documentId,
                currentUser != null ? currentUser.getId() : "anonymous",
                document.getPublicationStatus());

        StorageService.StoredFile storedFile = storageService.loadFileAsResource(document.getStorageKey());
        return new DocumentContent(
                storedFile.resource(),
                document.getOriginalFilename(),
                document.getMimeType(),
                storedFile.contentLength()
        );
    }

    /**
     * Trả về file để download theo phân quyền:
     * <ul>
     *   <li>Owner: download được ở mọi trạng thái.</li>
     *   <li>Admin / Teacher khác: chỉ download tài liệu đã PUBLISHED.</li>
     *   <li>Public / anonymous: không được download.</li>
     * </ul>
     *
     * @param documentId ID của document
     * @param currentUser User đang đăng nhập (bắt buộc, endpoint yêu cầu TEACHER/ADMIN)
     * @return DocumentContent chứa resource, filename và mimeType
     */
    @Transactional(readOnly = true)
    public DocumentContent getDocumentDownload(Long documentId, User currentUser) {
        Document document = requireDocument(documentId);

        if (!canDownloadDocument(document, currentUser)) {
            throw new AppException(ErrorCode.DOCUMENT_ACCESS_DENIED);
        }

        log.info("[DOWNLOAD] Download document | documentId={} | userId={} | role={} | publicationStatus={}",
                documentId, currentUser.getId(), currentUser.getRole(), document.getPublicationStatus());

        StorageService.StoredFile storedFile = storageService.loadFileAsResource(document.getStorageKey());
        return new DocumentContent(
                storedFile.resource(),
                document.getOriginalFilename(),
                document.getMimeType(),
                storedFile.contentLength()
        );
    }

    private boolean canViewDocumentContent(Document document, User currentUser) {
        // Teacher sở hữu luôn được xem tài liệu của mình, kể cả DRAFT
        if (currentUser != null && document.getUploadedBy().getId().equals(currentUser.getId())) {
            return true;
        }

        // Admin chỉ xem được tài liệu mà teacher đã gửi duyệt (không phải DRAFT)
        if (currentUser != null && currentUser.getRole() == UserRole.ADMIN) {
            return document.getPublicationStatus() != PublicationStatus.DRAFT;
        }

        // Người dùng khác chỉ xem được tài liệu đã được công bố
        return document.getPublicationStatus() == PublicationStatus.PUBLISHED;
    }

    private boolean canDownloadDocument(Document document, User currentUser) {
        // Teacher sở hữu luôn được download tài liệu của mình, kể cả DRAFT
        if (document.getUploadedBy().getId().equals(currentUser.getId())) {
            return true;
        }

        // Admin chỉ download được tài liệu mà teacher đã gửi duyệt (không phải DRAFT)
        if (currentUser.getRole() == UserRole.ADMIN) {
            return document.getPublicationStatus() != PublicationStatus.DRAFT;
        }

        // Teacher khác chỉ download được tài liệu đã được công bố
        return document.getPublicationStatus() == PublicationStatus.PUBLISHED
                && currentUser.getRole() == UserRole.TEACHER;
    }
}
