package com.lmsrag.backend.exception;


import com.lmsrag.backend.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // handle AppException
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {

        System.out.println("GLOBAL EXCEPTION CALLED");
        ErrorCode errorCode = ex.getErrorCode();

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.builder()
                        .httpStatus(errorCode.getStatus().value())
                        .code(errorCode.name())
                        .message(errorCode.getMessage())
                        .data("null")
                        .build());
    }

    // fallback (lỗi không kiểm soát)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleException(Exception ex) {

        ex.printStackTrace();

        ErrorCode errorCode = ErrorCode.INTERNAL_ERROR;

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.builder()
                        .httpStatus(errorCode.getStatus().value())
                        .code(errorCode.name())
                        .message(errorCode.getMessage())
                        .data("null")
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationException(
            MethodArgumentNotValidException ex
    ) {
        String errorKey = ex.getBindingResult()
                .getFieldError()
                .getDefaultMessage();

        ErrorCode errorCode;

        try {
            errorCode = ErrorCode.valueOf(errorKey);
        } catch (Exception e) {
            errorCode = ErrorCode.INTERNAL_ERROR;
        }

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.builder()
                        .httpStatus(errorCode.getStatus().value())
                        .code(errorCode.name())
                        .message(errorCode.getMessage())
                        .data("null")
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDeniedException(AccessDeniedException ex) {
        return ResponseEntity
                .status(ErrorCode.UNAUTHORIZED.getStatus())
                .body(ApiResponse.builder()
                        .httpStatus(ErrorCode.UNAUTHORIZED.getStatus().value())
                        .code(ErrorCode.UNAUTHORIZED.name())
                        .message(ErrorCode.UNAUTHORIZED.getMessage())
                        .data("null")
                        .build());
    }

}