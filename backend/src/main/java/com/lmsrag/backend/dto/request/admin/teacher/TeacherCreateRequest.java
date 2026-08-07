package com.lmsrag.backend.dto.request.admin.teacher;

import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.validation.ValidationPatterns;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@Schema(description = "Dữ liệu tạo tài khoản giảng viên")
public record TeacherCreateRequest(
        @Schema(description = "Họ và tên đầy đủ", example = "Trương Mỹ Tâm")
        @NotBlank
        @Size(min = 2, max = 100)
        @Pattern(regexp = "(?s).*\\p{IsLatin}.*", message = "Họ tên phải chứa chữ cái Latin")
        String name,

        @Schema(description = "Vai trò tài khoản", example = "TEACHER")
        @NotNull UserRole role,

        @Schema(description = "Email đăng nhập", example = "tam.truong@lms.edu.vn")
        @NotBlank
        @Email(message = "Email không hợp lệ")
        @Size(max = 255)
        String email,

        @Schema(description = "Ngày tháng năm sinh", example = "2003-05-20")
        @Past LocalDate dateOfBirth,

        @Schema(description = "Giới tính", example = "FEMALE")
        Gender gender,

        @Schema(description = "Khoa hoặc bộ môn", example = "Công nghệ thông tin")
        @Size(max = 255)
        String department,

        @Schema(description = "Số điện thoại", example = "0901234567")
        @Pattern(regexp = ValidationPatterns.PHONE_NUMBER, message = "Số điện thoại không hợp lệ")
        String phoneNumber,

        @Schema(description = "Ngày bắt đầu công tác", example = "2026-07-22")
        @PastOrPresent LocalDate hireDate
) {
}
