package com.lmsrag.backend.controller;

import com.lmsrag.backend.config.CustomUserDetails;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.request.profile.ChangePasswordRequest;
import com.lmsrag.backend.dto.request.profile.ProfileUpdateRequest;
import com.lmsrag.backend.dto.response.profile.ChangePasswordResponse;
import com.lmsrag.backend.dto.response.profile.UserProfileResponse;
import com.lmsrag.backend.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cung cấp API quản lý hồ sơ và mật khẩu của người dùng đang đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "My Profile", description = "API hồ sơ cá nhân của tài khoản đang đăng nhập")
@SecurityRequirement(name = "BearerAuth")
public class MeController {

    private final ProfileService profileService;

    @Operation(summary = "Lấy hồ sơ cá nhân chi tiết")
    @GetMapping("/profile")
    public ApiResponse<UserProfileResponse> getProfile(
            @AuthenticationPrincipal CustomUserDetails principal) {
        return ApiResponse.success(
                profileService.getProfile(principal.getUser().getId()),
                "Lấy hồ sơ cá nhân thành công"
        );
    }

    @Operation(summary = "Cập nhật hồ sơ cá nhân")
    @PatchMapping("/profile")
    public ApiResponse<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ProfileUpdateRequest request) {
        return ApiResponse.success(
                profileService.updateProfile(principal.getUser().getId(), request),
                "Cập nhật hồ sơ cá nhân thành công"
        );
    }

    @Operation(summary = "Đổi mật khẩu cá nhân")
    @PostMapping("/change-password")
    public ApiResponse<ChangePasswordResponse> changePassword(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        return ApiResponse.success(
                profileService.changePassword(principal.getUser().getId(), request),
                "Đổi mật khẩu thành công; vui lòng đăng nhập lại khi access token hết hạn"
        );
    }
}
