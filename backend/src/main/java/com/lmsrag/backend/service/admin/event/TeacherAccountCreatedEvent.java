package com.lmsrag.backend.service.admin.event;

public record TeacherAccountCreatedEvent(
        Long teacherId,
        String name,
        String email,
        String initialPassword
) {
}
