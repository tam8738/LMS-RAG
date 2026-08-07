package com.lmsrag.backend.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RejectReviewRequest {

    @NotBlank(message = "Lý do từ chối không được để trống")
    @Size(max = 2000, message = "Lý do từ chối tối đa 2000 ký tự")
    private String reason;
}
