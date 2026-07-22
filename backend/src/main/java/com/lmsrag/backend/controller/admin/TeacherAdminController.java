package com.lmsrag.backend.controller.admin;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherBatchCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherSearchRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherUpdateRequest;
import com.lmsrag.backend.dto.response.admin.teacher.PageResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherBatchCreateResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResetPasswordResponse;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResponse;
import com.lmsrag.backend.service.admin.TeacherAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller quản lý tài khoản giảng viên dành cho Admin.
 * <p>
 * Yêu cầu role {@code ADMIN} cho toàn bộ endpoint.
 */
@RestController
@RequestMapping("/api/v1/admin/teachers")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Teacher Management", description = "API quản lý giảng viên dành cho Admin")
public class TeacherAdminController {

    private final TeacherAdminService teacherAdminService;

    /**
     * Lấy danh sách giảng viên có phân trang, tìm kiếm và lọc.
     */
    @Operation(summary = "Lấy danh sách giảng viên")
    @GetMapping
    public ApiResponse<PageResponse<TeacherResponse>> getTeachers(@Valid TeacherSearchRequest request) {
        PageResponse<TeacherResponse> page = teacherAdminService.searchTeachers(request);
        return ApiResponse.success(
                page,
                "Lấy danh sách giảng viên thành công",
                ApiResponse.Meta.builder()
                        .total(page.totalElements())
                        .page(page.page() + 1)
                        .limit(page.size())
                        .totalPages(page.totalPages())
                        .build()
        );
    }

    /**
     * Tạo một tài khoản giảng viên mới.
     * Email lấy từ request; database tự cấp ID.
     * Mật khẩu tạm được sinh ngẫu nhiên và gửi đến email đăng nhập sau khi transaction commit.
     */
    @Operation(
            summary = "Tạo tài khoản giảng viên",
            description = "Email do Admin nhập; mật khẩu tạm được gửi bất đồng bộ đến email đăng nhập."
    )
    @PostMapping
    public ApiResponse<TeacherResponse> createTeacher(
            @Valid @RequestBody TeacherCreateRequest request) {
        TeacherResponse response = teacherAdminService.createTeacher(request);
        return ApiResponse.success(response, "Tạo tài khoản giảng viên thành công");
    }

    /**
     * Tạo hàng loạt tài khoản giảng viên.
     * Cho phép partial success: record hợp lệ vẫn được tạo nếu có record lỗi.
     */
    @Operation(summary = "Tạo hàng loạt tài khoản giảng viên")
    @PostMapping("/batch")
    public ApiResponse<TeacherBatchCreateResponse> createTeachersBatch(
            @Valid @RequestBody TeacherBatchCreateRequest request) {
        TeacherBatchCreateResponse response = teacherAdminService.createTeachersBatch(request);
        return ApiResponse.success(response, "Tạo hàng loạt giảng viên hoàn tất");
    }

    /**
     * Cập nhật thông tin giảng viên (PATCH — chỉ update field được gửi).
     */
    @Operation(summary = "Cập nhật thông tin giảng viên")
    @PatchMapping("/{teacherId}")
    public ApiResponse<TeacherResponse> updateTeacher(
            @PathVariable Long teacherId,
            @Valid @RequestBody TeacherUpdateRequest request) {
        TeacherResponse response = teacherAdminService.updateTeacher(teacherId, request);
        return ApiResponse.success(response, "Cập nhật thông tin giảng viên thành công");
    }

    /**
     * Kích hoạt tài khoản giảng viên.
     */
    @Operation(summary = "Kích hoạt tài khoản giảng viên")
    @PostMapping("/{teacherId}/activate")
    public ApiResponse<TeacherResponse> activateTeacher(@PathVariable Long teacherId) {
        TeacherResponse response = teacherAdminService.activateTeacher(teacherId);
        return ApiResponse.success(response, "Kích hoạt tài khoản giảng viên thành công");
    }

    /**
     * Vô hiệu hóa tài khoản giảng viên.
     */
    @Operation(summary = "Vô hiệu hóa tài khoản giảng viên")
    @PostMapping("/{teacherId}/deactivate")
    public ApiResponse<TeacherResponse> deactivateTeacher(@PathVariable Long teacherId) {
        TeacherResponse response = teacherAdminService.deactivateTeacher(teacherId);
        return ApiResponse.success(response, "Vô hiệu hóa tài khoản giảng viên thành công");
    }

    /**
     * Đặt lại mật khẩu cho giảng viên.
     * Mật khẩu mới được hệ thống tự động sinh và lưu dưới dạng hash;
     * không trả plaintext trong response.
     */
    @Operation(summary = "Đặt lại mật khẩu giảng viên")
    @PostMapping("/{teacherId}/reset-password")
    public ApiResponse<TeacherResetPasswordResponse> resetPassword(@PathVariable Long teacherId) {
        TeacherResetPasswordResponse response = teacherAdminService.resetPassword(teacherId);
        return ApiResponse.success(response, "Đặt lại mật khẩu thành công");
    }
}
