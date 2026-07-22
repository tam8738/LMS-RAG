package com.lmsrag.backend.mapper;

import com.lmsrag.backend.dto.response.profile.UserProfileResponse;
import com.lmsrag.backend.entity.User;

public final class UserProfileMapper {

    private UserProfileMapper() {
    }

    public static UserProfileResponse toResponse(User user) {
        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole())
                .status(user.getStatus())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .department(user.getDepartment())
                .phoneNumber(user.getPhoneNumber())
                .hireDate(user.getHireDate())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
