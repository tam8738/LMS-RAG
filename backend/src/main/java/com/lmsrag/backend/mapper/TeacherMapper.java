package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.request.admin.teacher.TeacherCreateRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherUpdateRequest;
import com.lmsrag.backend.dto.response.admin.teacher.TeacherResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserStatus;

import java.util.Locale;

/**
 * Chuyển đổi dữ liệu giữa yêu cầu quản trị, thực thể và phản hồi giảng viên.
 */

public class TeacherMapper {

    public static TeacherResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        return TeacherResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .department(user.getDepartment())
                .phoneNumber(user.getPhoneNumber())
                .hireDate(user.getHireDate())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public static User toEntity(TeacherCreateRequest request) {
        if (request == null) {
            return null;
        }

        return User.builder()
                .name(request.name().trim())
                .role(request.role())
                .email(request.email().trim().toLowerCase(Locale.ROOT))
                .dateOfBirth(request.dateOfBirth())
                .gender(request.gender())
                .department(request.department() != null ? request.department().trim() : null)
                .phoneNumber(request.phoneNumber() != null ? request.phoneNumber().trim() : null)
                .hireDate(request.hireDate())
                .status(UserStatus.ACTIVE)
                .build();
    }

    public static void updateEntityFromRequest(TeacherUpdateRequest request, User user) {
        if (request == null || user == null) {
            return;
        }

        if (request.name() != null) {
            user.setName(request.name().trim());
        }
        if (request.email() != null) {
            user.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        }
        if (request.dateOfBirth() != null) {
            user.setDateOfBirth(request.dateOfBirth());
        }
        if (request.gender() != null) {
            user.setGender(request.gender());
        }
        if (request.department() != null) {
            user.setDepartment(request.department().trim());
        }
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }
        if (request.hireDate() != null) {
            user.setHireDate(request.hireDate());
        }
    }
}
