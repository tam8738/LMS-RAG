package com.lmsrag.backend.event;

public record TeacherAccountCreatedEvent(
        Long teacherId,
        String name,
        String email,
        String initialPassword
) {
}
