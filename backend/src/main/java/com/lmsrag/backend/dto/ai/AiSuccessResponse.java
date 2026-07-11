package com.lmsrag.backend.dto.ai;

import lombok.Data;

@Data
public class AiSuccessResponse<T> {
    private Boolean success;
    private T data;
    private String message;
}