package com.lmsrag.backend.dto.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshTokenRequest(
        @NotBlank(message = "Refresh token không được để trống")
        @Size(max = 512, message = "Refresh token không hợp lệ")
        String refreshToken
) {
}
