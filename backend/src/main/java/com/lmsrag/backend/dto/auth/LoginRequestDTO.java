package com.lmsrag.backend.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "Thông tin đăng nhập")
public class LoginRequestDTO {

    @Schema(description = "Email người dùng", example = "teacher@example.com")
    private String email;

    @Schema(description = "Mật khẩu", example = "password123")
    private String password;
}