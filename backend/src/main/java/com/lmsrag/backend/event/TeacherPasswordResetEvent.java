package com.lmsrag.backend.event;

/**
 * Sự kiện yêu cầu thông báo mật khẩu tạm sau khi đặt lại mật khẩu giảng viên.
 */

public record TeacherPasswordResetEvent(
        Long teacherId,
        String name,
        String email,
        String newPassword
) {
}
