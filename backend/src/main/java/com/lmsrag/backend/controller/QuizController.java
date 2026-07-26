package com.lmsrag.backend.controller;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.quiz.QuizGenerateRequest;
import com.lmsrag.backend.dto.quiz.QuizResponse;
import com.lmsrag.backend.dto.quiz.QuizUpdateRequest;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** API Teacher sinh, review, chỉnh sửa và công bố quiz. */
@Slf4j
@RestController
@RequestMapping("/api/v1/quiz")
@RequiredArgsConstructor
@Tag(name = "Quiz", description = "Sinh và quản lý quiz từ document đã index")
public class QuizController {

    private final QuizService quizService;

    @Operation(summary = "Sinh quiz từ document")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<QuizResponse>> generateQuiz(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody QuizGenerateRequest request
    ) {
        User user = userDetails.getUser();
        log.info("[QUIZ-CTRL] Nhận yêu cầu sinh quiz | userId={} | documentId={} | questionCount={}",
                user.getId(), request.getDocumentId(), request.getQuestionCount());
        QuizResponse response = quizService.generateQuiz(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Sinh quiz thành công"));
    }

    @Operation(summary = "Xem quiz đã sinh")
    @GetMapping("/{quizId}")
    public ResponseEntity<ApiResponse<QuizResponse>> getQuiz(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long quizId
    ) {
        User user = userDetails.getUser();
        log.info("[QUIZ-CTRL] Nhận yêu cầu xem quiz | userId={} | quizId={}", user.getId(), quizId);
        return ResponseEntity.ok(ApiResponse.success(
                quizService.getQuiz(user, quizId),
                "Lấy quiz thành công"
        ));
    }

    @Operation(summary = "Sửa quiz draft")
    @PatchMapping("/{quizId}")
    public ResponseEntity<ApiResponse<QuizResponse>> updateQuiz(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long quizId,
            @Valid @RequestBody QuizUpdateRequest request
    ) {
        User user = userDetails.getUser();
        log.info("[QUIZ-CTRL] Nhận yêu cầu sửa quiz | userId={} | quizId={}", user.getId(), quizId);
        return ResponseEntity.ok(ApiResponse.success(
                quizService.updateQuiz(user, quizId, request),
                "Cập nhật quiz thành công"
        ));
    }

    @Operation(summary = "Công bố quiz")
    @PostMapping("/{quizId}/publish")
    public ResponseEntity<ApiResponse<QuizResponse>> publishQuiz(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long quizId
    ) {
        User user = userDetails.getUser();
        log.info("[QUIZ-CTRL] Nhận yêu cầu publish quiz | userId={} | quizId={}", user.getId(), quizId);
        return ResponseEntity.ok(ApiResponse.success(
                quizService.publishQuiz(user, quizId),
                "Công bố quiz thành công"
        ));
    }

    @Operation(summary = "Xóa quiz draft")
    @DeleteMapping("/{quizId}")
    public ResponseEntity<ApiResponse<Void>> deleteDraftQuiz(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long quizId
    ) {
        User user = userDetails.getUser();
        log.info("[QUIZ-CTRL] Nhận yêu cầu xóa quiz draft | userId={} | quizId={}", user.getId(), quizId);
        quizService.deleteDraftQuiz(user, quizId);
        return ResponseEntity.ok(ApiResponse.<Void>success(null, "Xóa quiz thành công"));
    }
}
