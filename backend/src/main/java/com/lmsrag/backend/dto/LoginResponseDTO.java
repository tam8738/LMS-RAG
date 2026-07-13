package com.lmsrag.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO chứa kết quả trả về sau khi đăng nhập thành công.
 * <p>
 * Ngoài JWT token, response còn kèm thông tin cơ bản của tài khoản để frontend
 * có thể render giao diện ngay lập tức mà không cần gọi thêm API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kết quả đăng nhập")
public class LoginResponseDTO {

    @Schema(description = "JWT access token dùng để xác thực các request sau này", example = "eyJhbGciOiJIUzI1NiIs...")
    private String accessToken;

    @Schema(description = "Thông tin tài khoản vừa đăng nhập")
    private AuthUserResponse user;
}
