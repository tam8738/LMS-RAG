package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.request.profile.ChangePasswordRequest;
import com.lmsrag.backend.dto.request.profile.ProfileUpdateRequest;
import com.lmsrag.backend.dto.response.profile.ChangePasswordResponse;
import com.lmsrag.backend.dto.response.profile.UserProfileResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.mapper.UserProfileMapper;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        return UserProfileMapper.toResponse(findUser(userId));
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = findUser(userId);
        List<String> changedFields = new ArrayList<>();

        if (request.name() != null) {
            String name = request.name().trim();
            if (name.length() < 2) {
                throw new AppException(ErrorCode.INVALID_INPUT);
            }
            user.setName(name);
            changedFields.add("name");
        }
        if (request.dateOfBirth() != null) {
            user.setDateOfBirth(request.dateOfBirth());
            changedFields.add("dateOfBirth");
        }
        if (request.gender() != null) {
            user.setGender(request.gender());
            changedFields.add("gender");
        }
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber().trim());
            changedFields.add("phoneNumber");
        }

        if (changedFields.isEmpty()) {
            throw new AppException(ErrorCode.PROFILE_NO_CHANGES);
        }

        User saved = userRepository.save(user);
        log.info("[PROFILE] Updated profile | userId={} | fields={}", userId, changedFields);
        return UserProfileMapper.toResponse(saved);
    }

    @Transactional
    public ChangePasswordResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUser(userId);

        if (request.currentPassword().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES
                || !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INCORRECT);
        }
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRMATION_MISMATCH);
        }
        if (request.newPassword().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES) {
            throw new AppException(ErrorCode.PASSWORD_WEAK);
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT);
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        int revokedCount = refreshTokenService.revokeAllActiveForUser(userId);
        Instant changedAt = Instant.now();

        log.info("[PROFILE] Changed password | userId={} | refreshTokensRevoked={}",
                userId, revokedCount);
        return new ChangePasswordResponse(changedAt, revokedCount);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}
