package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.rag.RagAnswerRequest;
import com.lmsrag.backend.dto.rag.RagAnswerResponse;
import com.lmsrag.backend.service.RagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
@Tag(name = "RAG", description = "Hỏi đáp RAG trên tài liệu đã công bố và đã index")
public class RagController {

    private final RagService ragService;

    @Operation(summary = "Hỏi đáp RAG trên danh sách tài liệu")
    @PostMapping("/answer")
    public ResponseEntity<ApiResponse<RagAnswerResponse>> answer(
            @Valid @RequestBody RagAnswerRequest request) {
        RagAnswerResponse response = ragService.answer(request);
        String message = Boolean.TRUE.equals(response.getNotFound())
                ? "Không tìm thấy ngữ cảnh phù hợp"
                : "Trả lời thành công";
        return ResponseEntity.ok(ApiResponse.success(response, message));
    }
}
