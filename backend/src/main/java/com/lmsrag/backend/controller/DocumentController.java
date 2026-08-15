package com.lmsrag.backend.controller;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.dto.document.DocumentFilterRequest;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.service.DocumentService;
import com.lmsrag.backend.util.ByteRangeResource;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

/**
 * Cung cấp API để giảng viên tải lên, cập nhật và quản lý tài liệu của mình.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Quản lý tài liệu của Teacher")
public class DocumentController {

    private final DocumentService documentService;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    @Operation(summary = "Upload tài liệu kèm metadata")
    @PostMapping(value = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") @NotNull MultipartFile file,
            @RequestParam("metadata") @NotNull String metadataJson) {
        log.info("[CONTROLLER] Nhận request upload document | fileName={} | fileSize={} bytes | metadataLength={}",
                file.getOriginalFilename(), file.getSize(), metadataJson.length());

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

        DocumentCreateRequest metadata;
        try {
            metadata = objectMapper.readValue(metadataJson, DocumentCreateRequest.class);
        } catch (JacksonException e) {
            log.warn("[CONTROLLER] Không thể parse metadata JSON | cause={}",
                    e.getClass().getSimpleName());
            throw new AppException(ErrorCode.INVALID_INPUT);
        }

        Set<ConstraintViolation<DocumentCreateRequest>> violations = validator.validate(metadata);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException("Document metadata validation failed", violations);
        }
        return metadata;
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
     * @param filter   Điều kiện tìm kiếm và lọc tài liệu
     * @param pageable Thông tin phân trang (page, size, sort)
     */
    @Operation(
            summary = "Lấy danh sách tài liệu của tôi",
            description = "Hỗ trợ tìm kiếm theo từ khóa (q), lọc theo processing_status, publication_status, " +
                    "subject, topic, chapter, tags và phân trang. Chỉ trả về tài liệu của teacher đang đăng nhập."
    )
    @GetMapping("/my/documents")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getMyDocuments(
            @Valid @ModelAttribute DocumentFilterRequest filter,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        log.info("[CONTROLLER] GET /my/documents | q={} | processingStatus={} | publicationStatus={} | subject={} | topic={} | chapter={} | tags={} | page={} | size={}",
                filter.getQ(), filter.getProcessingStatus(), filter.getPublicationStatus(),
                filter.getSubject(), filter.getTopic(), filter.getChapter(), filter.getTags(),
                pageable.getPageNumber(), pageable.getPageSize());

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

    @Operation(summary = "Yêu cầu xử lý lại RAG cho tài liệu của tôi đã công bố")
    @PostMapping("/my/documents/{documentId}/reprocess-rag")
    public ResponseEntity<ApiResponse<DocumentResponse>> reprocessRag(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.reprocessRag(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Yêu cầu xử lý lại RAG thành công"));
    }

    @Operation(
            summary = "Xem nội dung file document",
            description = """
                    Phân quyền:
                    - Owner: xem được ở mọi trạng thái.
                    - Admin: xem PUBLISHED và PENDING_REVIEW.
                    - Teacher khác / public: chỉ xem PUBLISHED.
                    """
    )
    @GetMapping("/documents/{documentId}/content")
    public ResponseEntity<?> getDocumentContent(
            @PathVariable Long documentId,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        DocumentService.DocumentContent content = documentService.getDocumentContent(
                documentId,
                userDetails != null ? userDetails.getUser() : null);

        return buildFileResponse(content, false, rangeHeader);
    }

    @Operation(
            summary = "Download file document",
            description = """
                    Phân quyền:
                    - Owner: download được ở mọi trạng thái.
                    - Admin / Teacher khác: chỉ download tài liệu đã PUBLISHED.
                    - Public / anonymous: không được download.
                    """
    )
    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<?> downloadDocument(
            @PathVariable Long documentId,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        DocumentService.DocumentContent content = documentService.getDocumentDownload(
                documentId, userDetails.getUser());

        return buildFileResponse(content, true, rangeHeader);
    }

    private ResponseEntity<?> buildFileResponse(
            DocumentService.DocumentContent content,
            boolean attachment,
            String rangeHeader) {
        MediaType mediaType = content.mimeType() != null
                ? MediaType.parseMediaType(content.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;
        ContentDisposition disposition = attachment
                ? ContentDisposition.attachment().filename(content.filename(), StandardCharsets.UTF_8).build()
                : ContentDisposition.inline().filename(content.filename(), StandardCharsets.UTF_8).build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentDisposition(disposition);
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");

        if (!StringUtils.hasText(rangeHeader)) {
            headers.setContentLength(content.contentLength());
            return new ResponseEntity<>(content.resource(), headers, HttpStatus.OK);
        }

        try {
            List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
            if (ranges.size() != 1) {
                return rangeNotSatisfiable(headers, content.contentLength());
            }

            HttpRange range = ranges.getFirst();
            long start = range.getRangeStart(content.contentLength());
            long end = range.getRangeEnd(content.contentLength());
            if (start < 0 || start >= content.contentLength() || end < start) {
                return rangeNotSatisfiable(headers, content.contentLength());
            }

            long rangeLength = end - start + 1;
            Resource region = new ByteRangeResource(content.resource(), start, rangeLength);
            headers.set(HttpHeaders.CONTENT_RANGE,
                    "bytes %d-%d/%d".formatted(start, end, content.contentLength()));
            headers.setContentLength(rangeLength);
            return new ResponseEntity<>(region, headers, HttpStatus.PARTIAL_CONTENT);
        } catch (IllegalArgumentException exception) {
            log.debug("Invalid document byte range | range={} | size={}",
                    rangeHeader, content.contentLength());
            return rangeNotSatisfiable(headers, content.contentLength());
        }
    }

    private ResponseEntity<Void> rangeNotSatisfiable(HttpHeaders headers, long contentLength) {
        headers.set(HttpHeaders.CONTENT_RANGE, "bytes */" + contentLength);
        headers.setContentLength(0);
        return new ResponseEntity<>(null, headers, HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
    }
}
