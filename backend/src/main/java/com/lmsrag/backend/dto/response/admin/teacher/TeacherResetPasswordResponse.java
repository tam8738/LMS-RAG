package com.lmsrag.backend.dto.response.admin.teacher;

import lombok.Builder;

import java.time.Instant;

@Builder
public record TeacherResetPasswordResponse(
        Long teacherId,
        boolean emailSent,
        Instant resetAt
) {
}
