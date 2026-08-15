package com.lmsrag.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Dữ liệu đăng nhập do người dùng gửi đến hệ thống.
 */
@Data
@Schema(description = "Thông tin đăng nhập")
public class LoginRequestDTO {

    @Schema(description = "Email người dùng", example = "teacher@example.com")
    @NotBlank(message = "EMAIL_REQUIRED")
    @Email(message = "EMAIL_INVALID")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    @Schema(description = "Mật khẩu", example = "password123")
    @NotBlank(message = "PASSWORD_REQUIRED")
    @Size(max = 72, message = "Mật khẩu tối đa 72 ký tự")
    private String password;
}
