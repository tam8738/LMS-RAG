package com.lmsrag.backend.event;

/**
 * Sự kiện yêu cầu gửi thông tin đăng nhập khi tài khoản giảng viên được tạo.
 */

public record TeacherAccountCreatedEvent(
        Long teacherId,
        String name,
        String email,
        String initialPassword
) {
}
