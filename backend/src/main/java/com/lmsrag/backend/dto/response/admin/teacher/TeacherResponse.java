package com.lmsrag.backend.dto.response.admin.teacher;

import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;

@Builder
@Schema(description = "Thông tin tài khoản giảng viên")
public record TeacherResponse(
        @Schema(description = "ID do database tự sinh", example = "18")
        Long id,

        @Schema(
                description = "Email đăng nhập do Admin cung cấp khi tạo tài khoản",
                example = "tam.truong@lms.edu.vn"
        )
        String email,

        @Schema(description = "Họ và tên đầy đủ", example = "Trương Mỹ Tâm")
        String name,

        @Schema(description = "Vai trò tài khoản", example = "TEACHER")
        UserRole role,

        LocalDate dateOfBirth,
        Gender gender,
        String department,
        String phoneNumber,
        LocalDate hireDate,
        UserStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
