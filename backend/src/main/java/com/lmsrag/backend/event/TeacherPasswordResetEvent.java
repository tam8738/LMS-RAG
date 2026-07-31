package com.lmsrag.backend.event;

public record TeacherPasswordResetEvent(
        Long teacherId,
        String name,
        String email,
        String newPassword
) {
}
