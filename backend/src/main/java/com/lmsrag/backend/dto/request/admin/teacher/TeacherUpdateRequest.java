package com.lmsrag.backend.dto.request.admin.teacher;

import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.validation.ValidationPatterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TeacherUpdateRequest(
        @Size(min = 2, max = 100, message = "Họ tên phải có từ 2 đến 100 ký tự")
        @Pattern(regexp = "(?s).*\\p{IsLatin}.*", message = "Họ tên phải chứa chữ cái Latin")
        String name,
        @Email(message = "Email không hợp lệ")
        @Pattern(regexp = ".*\\S.*", message = "Email không được để trống")
        @Size(max = 255) String email,
        @Past LocalDate dateOfBirth,
        Gender gender,
        @Size(max = 255) String department,
        @Pattern(regexp = ValidationPatterns.PHONE_NUMBER, message = "Số điện thoại không hợp lệ")
        String phoneNumber,
        @PastOrPresent LocalDate hireDate
) {
}
