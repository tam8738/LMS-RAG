package com.lmsrag.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.dto.document.MyDocumentFilterRequest;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Quản lý tài liệu của Teacher")
public class DocumentController {

    private final DocumentService documentService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Operation(summary = "Upload tài liệu kèm metadata")
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") @NotNull MultipartFile file,
            @RequestParam("metadata") @NotNull String metadataJson) {
        log.info("[CONTROLLER] Nhận request upload document | fileName={} | fileSize={} bytes | metadataJson={}",
                file.getOriginalFilename(), file.getSize(), metadataJson);

        DocumentCreateRequest metadata = parseMetadata(metadataJson);
        DocumentResponse response = documentService.uploadDocument(file, metadata);
        log.info("[CONTROLLER] Upload document thành công | documentId={}", response.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Upload tài liệu thành công"));
    }

    private DocumentCreateRequest parseMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            log.warn("[CONTROLLER] Metadata JSON rỗng");
            throw new AppException(ErrorCode.METADATA_REQUIRED);
        }

        try {
            DocumentCreateRequest metadata = objectMapper.readValue(metadataJson, DocumentCreateRequest.class);

            Set<ConstraintViolation<DocumentCreateRequest>> violations = validator.validate(metadata);
            if (!violations.isEmpty()) {
                String details = violations.stream()
                        .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                        .collect(Collectors.joining(", "));
                log.warn("[CONTROLLER] Metadata validation failed | details={}", details);
                throw new AppException(ErrorCode.INVALID_INPUT);
            }

            return metadata;
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[CONTROLLER] Không thể parse metadata JSON | error={}", e.getMessage());
            throw new AppException(ErrorCode.INVALID_INPUT);
        }
    }

    /**
     * Lấy danh sách tài liệu cá nhân của teacher đang đăng nhập.
     *
     * <p>Hỗ trợ:
     * <ul>
     *   <li><b>Tìm kiếm</b>: {@code q} — tìm trong title, description, subject, topic, chapter</li>
     *   <li><b>Lọc trạng thái AI</b>: {@code processingStatus} — UPLOADED | ANALYZING | ANALYZED | PROCESSING | PROCESSED | FAILED</li>
     *   <li><b>Lọc trạng thái công bố</b>: {@code publicationStatus} — DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED</li>
     *   <li><b>Lọc metadata</b>: {@code subject}, {@code topic}, {@code chapter}</li>
     *   <li><b>Lọc tags</b>: {@code tags} — danh sách phân cách dấu phẩy, ví dụ: {@code database,sql}</li>
     *   <li><b>Phân trang</b>: {@code page}, {@code size}, {@code sort} — Spring Pageable chuẩn</li>
     * </ul>
     *
     * @param q                 Từ khóa tìm kiếm tự do (optional)
     * @param processingStatus  Lọc theo trạng thái xử lý AI (optional)
     * @param publicationStatus Lọc theo trạng thái công bố (optional)
     * @param subject           Lọc theo môn học (optional, khớp chính xác)
     * @param topic             Lọc theo chủ đề (optional, khớp một phần)
     * @param chapter           Lọc theo chương (optional, khớp một phần)
     * @param tags              Lọc theo tags (optional, phân cách bởi dấu phẩy)
     * @param pageable          Thông tin phân trang (page, size, sort)
     */
    @Operation(
            summary = "Lấy danh sách tài liệu của tôi",
            description = "Hỗ trợ tìm kiếm theo từ khóa (q), lọc theo processing_status, publication_status, " +
                    "subject, topic, chapter, tags và phân trang. Chỉ trả về tài liệu của teacher đang đăng nhập."
    )
    @GetMapping("/my/documents")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getMyDocuments(
            @Parameter(description = "Từ khóa tìm kiếm trong title/description/subject/topic/chapter")
            @RequestParam(required = false) String q,

            @Parameter(description = "Lọc theo trạng thái AI xử lý: UPLOADED | ANALYZING | ANALYZED | PROCESSING | PROCESSED | FAILED")
            @RequestParam(required = false) AiProcessingStatus processingStatus,

            @Parameter(description = "Lọc theo trạng thái công bố: DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED")
            @RequestParam(required = false) PublicationStatus publicationStatus,

            @Parameter(description = "Lọc theo môn học (khớp chính xác)")
            @RequestParam(required = false) String subject,

            @Parameter(description = "Lọc theo chủ đề (khớp một phần, không phân biệt hoa thường)")
            @RequestParam(required = false) String topic,

            @Parameter(description = "Lọc theo chương (khớp một phần, không phân biệt hoa thường)")
            @RequestParam(required = false) String chapter,

            @Parameter(description = "Lọc theo tags, phân cách bởi dấu phẩy. Ví dụ: database,sql")
            @RequestParam(required = false) String tags,

            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("[CONTROLLER] GET /my/documents | q={} | processingStatus={} | publicationStatus={} | subject={} | topic={} | chapter={} | tags={} | page={} | size={}",
                q, processingStatus, publicationStatus, subject, topic, chapter, tags,
                pageable.getPageNumber(), pageable.getPageSize());

        // Đóng gói các tham số filter vào DTO để truyền xuống service
        MyDocumentFilterRequest filter = new MyDocumentFilterRequest();
        filter.setQ(q);
        filter.setProcessingStatus(processingStatus);
        filter.setPublicationStatus(publicationStatus);
        filter.setSubject(subject);
        filter.setTopic(topic);
        filter.setChapter(chapter);
        filter.setTags(tags);

        Page<DocumentResponse> response = documentService.getMyDocuments(filter, pageable);

        log.info("[CONTROLLER] GET /my/documents thành công | totalElements={} | totalPages={}",
                response.getTotalElements(), response.getTotalPages());

        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách tài liệu thành công"));
    }

    @Operation(summary = "Lấy chi tiết tài liệu của tôi")
    @GetMapping("/my/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getMyDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.getMyDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy chi tiết thành công"));
    }

    @Operation(summary = "Cập nhật metadata và/hoặc file tài liệu")
    @PatchMapping(value = "/my/documents/{documentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponse>> updateDocument(
            @PathVariable Long documentId,
            @Valid @RequestPart("metadata") DocumentUpdateRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        log.info("[CONTROLLER] Nhận request cập nhật document | documentId={} | hasFile={}",
                documentId, file != null && !file.isEmpty());
        DocumentResponse response = documentService.updateDocument(documentId, request, file);
        return ResponseEntity.ok(ApiResponse.success(response, "Cập nhật thành công"));
    }

    @Operation(summary = "Xóa tài liệu")
    @DeleteMapping("/my/documents/{documentId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa tài liệu thành công"));
    }

    @Operation(summary = "Gửi tài liệu đi duyệt")
    @PostMapping("/my/documents/{documentId}/submit-review")
    public ResponseEntity<ApiResponse<DocumentResponse>> submitReview(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.submitReview(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Gửi duyệt thành công"));
    }

    @Operation(summary = "Yêu cầu xử lý lại RAG cho tài liệu đã công bố")
    @PostMapping("/documents/{documentId}/reprocess-rag")
    public ResponseEntity<ApiResponse<DocumentResponse>> reprocessRag(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.reprocessRag(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Yêu cầu xử lý lại RAG thành công"));
    }
}
