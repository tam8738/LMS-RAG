package com.lmsrag.backend.dto.ai;

import lombok.Data;

/**
 * Envelope phản hồi thành công dùng khi giải mã kết quả từ AI Service.
 */
@Data
public class AiSuccessResponse<T> {
    private Boolean success;
    private T data;
    private String message;
}
