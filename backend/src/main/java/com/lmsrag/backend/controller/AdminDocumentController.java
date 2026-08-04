package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentFilterRequest;
import com.lmsrag.backend.dto.document.RejectReviewRequest;
import com.lmsrag.backend.enums.AiProcessingStatus;
import com.lmsrag.backend.enums.PublicationStatus;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Documents", description = "Admin kiểm duyệt và quản lý tài liệu (chỉ thấy tài liệu đã được teacher gửi duyệt)")
public class AdminDocumentController {

    private final DocumentService documentService;

    @Operation(summary = "Lấy danh sách tài liệu đã gửi duyệt (không bao gồm tài liệu nháp DRAFT)")
    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getAdminDocuments(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) AiProcessingStatus processingStatus,
            @RequestParam(required = false) PublicationStatus publicationStatus,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String chapter,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Long uploadedBy,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        // Dùng DocumentFilterRequest - DTO dùng chung cho cả Teacher và Admin
        DocumentFilterRequest filter = new DocumentFilterRequest();
        filter.setQ(q);
        filter.setProcessingStatus(processingStatus);
        filter.setPublicationStatus(publicationStatus);
        filter.setSubject(subject);
        filter.setTopic(topic);
        filter.setChapter(chapter);
        filter.setTags(tags);
        filter.setUploadedBy(uploadedBy);

        Page<DocumentResponse> response = documentService.getAdminDocuments(filter, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách tài liệu hệ thống thành công"));
    }

    @Operation(summary = "Lấy chi tiết một tài liệu đã gửi duyệt (không bao gồm tài liệu nháp DRAFT)")
    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getAdminDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.getAdminDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy chi tiết tài liệu thành công"));
    }

    @Operation(summary = "Lấy danh sách tài liệu chờ duyệt")
    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getReviewQueue() {
        List<DocumentResponse> response = documentService.getReviewQueue();
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách chờ duyệt thành công"));
    }

    @Operation(summary = "Lấy chi tiết tài liệu chờ duyệt")
    @GetMapping("/reviews/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getReviewDetail(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.getReviewDetail(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy chi tiết thành công"));
    }

    @Operation(summary = "Duyệt tài liệu")
    @PostMapping("/reviews/{documentId}/approve")
    public ResponseEntity<ApiResponse<DocumentResponse>> approveReview(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.approveReview(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Duyệt tài liệu thành công"));
    }

    @Operation(summary = "Từ chối tài liệu")
    @PostMapping("/reviews/{documentId}/reject")
    public ResponseEntity<ApiResponse<DocumentResponse>> rejectReview(
            @PathVariable Long documentId,
            @Valid @RequestBody RejectReviewRequest request) {
        DocumentResponse response = documentService.rejectReview(documentId, request.getReason());
        return ResponseEntity.ok(ApiResponse.success(response, "Từ chối tài liệu thành công"));
    }

    @Operation(summary = "Lưu trữ tài liệu đã công bố")
    @PostMapping("/documents/{documentId}/archive")
    public ResponseEntity<ApiResponse<DocumentResponse>> archiveDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.archiveDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lưu trữ tài liệu thành công"));
    }
}
