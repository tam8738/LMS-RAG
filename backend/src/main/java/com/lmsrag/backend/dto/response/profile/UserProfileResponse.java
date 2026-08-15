package com.lmsrag.backend.dto.response.profile;

import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Thông tin hồ sơ của người dùng đang đăng nhập.
 */
@Builder
public record UserProfileResponse(
        Long id,
        String email,
        String name,
        UserRole role,
        UserStatus status,
        LocalDate dateOfBirth,
        Gender gender,
        String department,
        String phoneNumber,
        LocalDate hireDate,
        Instant createdAt,
        Instant updatedAt
) {
}
