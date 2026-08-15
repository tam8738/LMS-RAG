package com.lmsrag.backend.dto.response.admin.teacher;

import lombok.Builder;

import java.time.Instant;

/**
 * Mật khẩu tạm và thông tin liên quan sau khi đặt lại mật khẩu giảng viên.
 */
@Builder
public record TeacherResetPasswordResponse(
        Long teacherId,
        boolean emailSent,
        Instant resetAt
) {
}
