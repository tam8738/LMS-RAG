package com.lmsrag.backend.controller;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.AuthUserResponse;
import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.dto.UpdateProfileRequestDTO;
import com.lmsrag.backend.dto.ChangePasswordRequestDTO;
import com.lmsrag.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


/**
 * Controller xử lý các API xác thực.
 * <p>
 * Cung cấp endpoint đăng nhập (public) và lấy thông tin tài khoản hiện tại (authenticated).
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API đăng ký, đăng nhập, đăng xuất")
public class AuthController {

    private final AuthService authService;

    /**
     * Đăng nhập và nhận JWT token kèm thông tin tài khoản.
     *
     * @param request thông tin đăng nhập
     * @return access token và thông tin tài khoản
     */
    @Operation(
            summary = "Đăng nhập",
            description = "Nhận email và password, trả về JWT token và thông tin tài khoản nếu hợp lệ"
    )
    @PostMapping("/login")
    public ApiResponse<LoginResponseDTO> login(@RequestBody LoginRequestDTO request) {
        LoginResponseDTO response = authService.login(request);
        return ApiResponse.success(response, "Đăng nhập thành công");
    }

    /**
     * Lấy thông tin tài khoản đang đăng nhập từ JWT token.
     *
     * @param userDetails thông tin xác thực được Spring Security inject từ token
     * @return thông tin tài khoản hiện tại
     */
    @Operation(
            summary = "Lấy thông tin tài khoản hiện tại",
            description = "Trả về thông tin user dựa trên token được gửi trong Authorization header",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @GetMapping("/me")
    public ApiResponse<AuthUserResponse> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AuthUserResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ApiResponse.success(response, "Lấy thông tin tài khoản thành công");
    }

    /**
     * Đăng xuất và vô hiệu hóa JWT token hiện tại.
     * Token sẽ được thêm vào blacklist và không thể dùng lại cho đến khi hết hạn.
     *
     * @param authHeader Authorization header chứa Bearer token
     * @return thông điệp đăng xuất thành công
     */
    @Operation(
            summary = "Đăng xuất",
            description = "Vô hiệu hóa JWT token hiện tại bằng cách thêm vào blacklist",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        authService.logout(token);
        return ApiResponse.success(null, "Đăng xuất thành công");
    }

    @Operation(
            summary = "Cập nhật thông tin giảng viên",
            description = "Cập nhật họ và tên của giảng viên",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PutMapping("/profile")
    public ApiResponse<AuthUserResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody UpdateProfileRequestDTO request) {
        AuthUserResponse response = authService.updateProfile(userDetails.getUsername(), request);
        return ApiResponse.success(response, "Cập nhật thông tin giảng viên thành công");
    }

    @Operation(
            summary = "Thay đổi mật khẩu",
            description = "Thay đổi mật khẩu tài khoản",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PutMapping("/change-password")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ChangePasswordRequestDTO request) {
        authService.changePassword(userDetails.getUsername(), request);
        return ApiResponse.success(null, "Đổi mật khẩu thành công");
    }
}
