package com.lmsrag.backend.controller;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.AuthUserResponse;
import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.dto.request.auth.RefreshTokenRequest;
import com.lmsrag.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cung cấp API đăng nhập, làm mới token và đăng xuất.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "API xác thực và quản lý phiên đăng nhập")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Đăng nhập")
    @PostMapping("/login")
    public ApiResponse<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ApiResponse.success(authService.login(request), "Đăng nhập thành công");
    }

    @Operation(summary = "Làm mới access token và rotate refresh token")
    @PostMapping("/refresh")
    public ApiResponse<LoginResponseDTO> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.success(
                authService.refresh(request.refreshToken()),
                "Làm mới access token thành công"
        );
    }

    @Operation(summary = "Thu hồi refresh token")
    @PostMapping("/refresh/revoke")
    public ApiResponse<Void> revokeRefreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        authService.revokeRefreshToken(request.refreshToken());
        return ApiResponse.success(null, "Thu hồi refresh token thành công");
    }

    @Operation(
            summary = "Lấy thông tin cơ bản của tài khoản hiện tại",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @GetMapping("/me")
    public ApiResponse<AuthUserResponse> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ApiResponse.success(
                authService.getCurrentUser(userDetails.getUsername()),
                "Lấy thông tin tài khoản thành công"
        );
    }

    @Operation(
            summary = "Đăng xuất và thu hồi access token hiện tại",
            security = @SecurityRequirement(name = "BearerAuth")
    )
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestHeader("Authorization") String authHeader) {
        authService.logout(extractBearerToken(authHeader));
        return ApiResponse.success(null, "Đăng xuất thành công");
    }

    private String extractBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return "";
        }
        return authHeader.substring(7);
    }
}
