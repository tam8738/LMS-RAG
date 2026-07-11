package com.lmsrag.backend.dto.document;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectReviewRequest {

    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reason;
}
