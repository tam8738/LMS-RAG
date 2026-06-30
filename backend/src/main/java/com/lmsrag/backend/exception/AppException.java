package com.lmsrag.backend.exception;

import lombok.Getter;

/**
 * Exception dùng cho mọi lỗi nghiệp vụ trong hệ thống.
 * Thay vì ném exception chung chung, dùng class này kèm một {@link ErrorCode}
 * để GlobalExceptionHandler có đủ thông tin (HTTP status, code, message) để build response.
 *
 * Ví dụ: throw new AppException(ErrorCode.EMAIL_EXISTED);
 */
@Getter
public class AppException extends RuntimeException {

    /** Mã lỗi nghiệp vụ, chứa sẵn HTTP status và message tương ứng */
    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage()); // message cho log/debug
        this.errorCode = errorCode;
    }
}