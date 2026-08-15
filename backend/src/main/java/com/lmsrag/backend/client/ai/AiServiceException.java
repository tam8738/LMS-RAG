package com.lmsrag.backend.client.ai;

import lombok.Getter;

/**
 * Biểu diễn lỗi kỹ thuật phát sinh khi Backend giao tiếp với AI Service.
 */
@Getter
public class AiServiceException extends RuntimeException {

    private final String errorCode;

    public AiServiceException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public AiServiceException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
}
