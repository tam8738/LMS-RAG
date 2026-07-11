package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.RejectReviewRequest;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Reviews", description = "Admin kiểm duyệt tài liệu")
public class AdminDocumentController {

    private final DocumentService documentService;

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

    @Operation(summary = "Archive tài liệu đã công bố")
    @PostMapping("/documents/{documentId}/archive")
    public ResponseEntity<ApiResponse<DocumentResponse>> archiveDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.archiveDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Archive tài liệu thành công"));
    }
}
