package com.lmsrag.backend.dto;

import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO dùng chung để trả thông tin cơ bản của người dùng đã xác thực.
 * <p>
 * Được sử dụng trong:
 * <ul>
 *     <li>{@link LoginResponseDTO} - kết quả đăng nhập</li>
 *     <li>{@code GET /api/v1/auth/me} - lấy thông tin user hiện tại</li>
 * </ul>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin người dùng đã xác thực")
public class AuthUserResponse {

    @Schema(description = "ID người dùng", example = "3")
    private Long id;

    @Schema(description = "Họ và tên", example = "Nguyễn Văn A")
    private String name;

    @Schema(description = "Địa chỉ email", example = "teacher.a@example.com")
    private String email;

    @Schema(description = "Vai trò", example = "TEACHER")
    private UserRole role;

    @Schema(description = "Trạng thái tài khoản", example = "ACTIVE")
    private UserStatus status;

    @Schema(description = "ThờI gian tạo tài khoản", example = "2026-07-10T08:30:00Z")
    private Instant createdAt;

    @Schema(description = "ThờI gian cập nhật gần nhất", example = "2026-07-14T10:15:00Z")
    private Instant updatedAt;
}
