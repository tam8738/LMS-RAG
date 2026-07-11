package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Quản lý tài liệu của Teacher")
public class DocumentController {

    private final DocumentService documentService;

    @Operation(summary = "Tạo document metadata")
    @PostMapping("/documents")
    public ResponseEntity<ApiResponse<DocumentResponse>> createDocument(
            @Valid @RequestBody DocumentCreateRequest request) {
        DocumentResponse response = documentService.createDocument(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Tạo tài liệu thành công"));
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