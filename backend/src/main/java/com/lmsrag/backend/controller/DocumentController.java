package com.lmsrag.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
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
            @RequestPart("file") @NotNull MultipartFile file,
            @RequestPart("metadata") @NotNull String metadataJson) {
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

    @Operation(summary = "Lấy danh sách tài liệu của tôi")
    @GetMapping("/my/documents")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getMyDocuments(
            @PageableDefault(size = 20) Pageable pageable) {
        Page<DocumentResponse> response = documentService.getMyDocuments(pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách thành công"));
    }

    @Operation(summary = "Lấy chi tiết tài liệu của tôi")
    @GetMapping("/my/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getMyDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.getMyDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy chi tiết thành công"));
    }

    @Operation(summary = "Cập nhật metadata tài liệu")
    @PatchMapping("/my/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentUpdateRequest request) {
        DocumentResponse response = documentService.updateDocument(documentId, request);
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
}