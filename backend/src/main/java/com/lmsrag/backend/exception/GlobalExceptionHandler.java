package com.lmsrag.backend.exception;


import com.lmsrag.backend.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/**
 * Bắt và xử lý tập trung tất cả exception ném ra từ Controller/Service,
 * chuyển đổi thành response chuẩn theo {@link ApiResponse} (envelope success/error).
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý các lỗi nghiệp vụ chủ động ném ra bằng AppException
     * (vd: throw new AppException(ErrorCode.EMAIL_EXISTED)).
     * HTTP status và message được lấy trực tiếp từ ErrorCode tương ứng.
     */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {

        ErrorCode errorCode = ex.getErrorCode();
        log.warn("Business exception: code={}, message={}", errorCode.name(), errorCode.getMessage());

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.name(), errorCode.getMessage()));
    }

    /**
     * Fallback: bắt mọi exception không xác định (lỗi hệ thống, NullPointerException,...)
     * để tránh lộ stack trace cho client, đồng thời log lại để debug.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception ex) {

        log.error("Unexpected system error: {}", ex.getMessage(), ex);

        ErrorCode errorCode = ErrorCode.INTERNAL_ERROR;

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.name(), errorCode.getMessage()));
    }

    /**
     * Xử lý lỗi validate dữ liệu đầu vào (annotation @Valid trên request body).
     * Gom TẤT CẢ field lỗi (không chỉ field đầu tiên) thành danh sách "details"
     * để client có thể hiển thị lỗi cho từng field tương ứng.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(
            MethodArgumentNotValidException ex
    ) {
        List<ApiResponse.ErrorDetail> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toErrorDetail)
                .toList();

        ErrorCode errorCode = ErrorCode.INVALID_INPUT;

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.name(), errorCode.getMessage(), details));
    }

    /**
     * Convert FieldError sang ErrorDetail.
     * Quy ước: message trong annotation validate (vd: @NotBlank(message = "EMAIL_REQUIRED"))
     * có thể là tên của một ErrorCode -> resolve để lấy message tiếng Việt thật sự.
     * Nếu không khớp ErrorCode nào thì giữ nguyên message gốc (coi như đã là text thuần).
     */
    private ApiResponse.ErrorDetail toErrorDetail(FieldError fieldError) {
        String rawMessage = fieldError.getDefaultMessage();
        String resolvedMessage;

        try {
            resolvedMessage = ErrorCode.valueOf(rawMessage).getMessage();
        } catch (Exception e) {
            resolvedMessage = rawMessage;
        }

        return ApiResponse.ErrorDetail.builder()
                .field(fieldError.getField())
                .message(resolvedMessage)
                .build();
    }

    /**
     * Xử lý lỗi phân quyền (user đã đăng nhập nhưng không đủ quyền truy cập resource).
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : "anonymous";

        log.warn("Access denied for user '{}' to resource: {}", username, ex.getMessage());

        return ResponseEntity
                .status(ErrorCode.FORBIDDEN.getStatus())
                .body(ApiResponse.error(ErrorCode.FORBIDDEN.name(), ErrorCode.FORBIDDEN.getMessage()));
    }

}