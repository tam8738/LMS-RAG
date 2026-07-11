package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentResponse;
import com.lmsrag.backend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/library")
@RequiredArgsConstructor
@Tag(name = "Library", description = "Thư viện tài liệu đã công bố")
public class LibraryController {

    private final DocumentService documentService;

    @Operation(summary = "Lấy danh sách tài liệu trong Library")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getLibrary(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String chapter,
            @RequestParam(required = false) String tags,
            @RequestParam(required = false) Long uploadedBy,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<DocumentResponse> response = documentService.getLibraryDocuments(subject, topic, chapter, q, tags, uploadedBy, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy danh sách Library thành công"));
    }

    @Operation(summary = "Lấy chi tiết tài liệu trong Library")
    @GetMapping("/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getLibraryDocument(
            @PathVariable Long documentId) {
        DocumentResponse response = documentService.getLibraryDocument(documentId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy chi tiết thành công"));
    }
}
