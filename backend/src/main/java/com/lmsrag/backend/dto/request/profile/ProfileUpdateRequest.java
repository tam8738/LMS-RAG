package com.lmsrag.backend.dto.request.profile;

import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.validation.ValidationPatterns;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Các trường người dùng được phép thay đổi trong hồ sơ cá nhân.
 */

public record ProfileUpdateRequest(
        @Size(min = 2, max = 100, message = "Họ tên phải có từ 2 đến 100 ký tự")
        @Pattern(regexp = "(?s).*\\p{IsLatin}.*", message = "Họ tên phải chứa chữ cái Latin")
        String name,

        @Past(message = "Ngày sinh phải ở trong quá khứ")
        LocalDate dateOfBirth,

        Gender gender,

        @Pattern(
                regexp = ValidationPatterns.PHONE_NUMBER,
                message = "Số điện thoại phải gồm 9 đến 15 chữ số"
        )
        String phoneNumber
) {
}
