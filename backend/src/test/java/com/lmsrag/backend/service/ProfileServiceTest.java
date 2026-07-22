package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.request.profile.ChangePasswordRequest;
import com.lmsrag.backend.dto.request.profile.ProfileUpdateRequest;
import com.lmsrag.backend.dto.response.profile.ChangePasswordResponse;
import com.lmsrag.backend.dto.response.profile.UserProfileResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.Gender;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(userRepository, passwordEncoder, refreshTokenService);
    }

    @Test
    void getProfile_shouldReturnDetailedProfileWithoutPassword() {
        User user = user();
        when(userRepository.findById(18L)).thenReturn(Optional.of(user));

        UserProfileResponse response = profileService.getProfile(18L);

        assertThat(response.id()).isEqualTo(18L);
        assertThat(response.email()).isEqualTo("tamtm018@lms.edu.vn");
    }

    @Test
    void updateProfile_shouldUpdateOnlyPersonalFields() {
        User user = user();
        when(userRepository.findById(18L)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        ProfileUpdateRequest request = new ProfileUpdateRequest(
                "  Trương Mỹ Tâm mới  ",
                LocalDate.of(2000, 1, 2),
                Gender.FEMALE,
                "+84901234567"
        );

        UserProfileResponse response = profileService.updateProfile(18L, request);

        assertThat(response.name()).isEqualTo("Trương Mỹ Tâm mới");
        assertThat(response.phoneNumber()).isEqualTo("+84901234567");
        assertThat(response.email()).isEqualTo("tamtm018@lms.edu.vn");
    }

    @Test
    void updateProfile_shouldRejectEmptyPatch() {
        when(userRepository.findById(18L)).thenReturn(Optional.of(user()));
        ProfileUpdateRequest request = new ProfileUpdateRequest(null, null, null, null);

        assertThatThrownBy(() -> profileService.updateProfile(18L, request))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.PROFILE_NO_CHANGES));

        verify(userRepository, never()).save(user());
    }

    @Test
    void changePassword_shouldEncodePasswordAndRevokeAllRefreshTokens() {
        User user = user();
        when(userRepository.findById(18L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("old-password", "encoded-old")).thenReturn(true);
        when(passwordEncoder.matches("new-password", "encoded-old")).thenReturn(false);
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-new");
        when(refreshTokenService.revokeAllActiveForUser(18L)).thenReturn(3);
        ChangePasswordRequest request = new ChangePasswordRequest(
                "old-password",
                "new-password",
                "new-password"
        );

        ChangePasswordResponse response = profileService.changePassword(18L, request);

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        assertThat(response.refreshTokensRevoked()).isEqualTo(3);
        verify(userRepository).save(user);
        verify(refreshTokenService).revokeAllActiveForUser(18L);
    }

    @Test
    void changePassword_shouldRejectIncorrectCurrentPassword() {
        User user = user();
        when(userRepository.findById(18L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-old")).thenReturn(false);

        assertThatThrownBy(() -> profileService.changePassword(
                18L,
                new ChangePasswordRequest("wrong-password", "new-password", "new-password")
        ))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.CURRENT_PASSWORD_INCORRECT));

        verify(refreshTokenService, never()).revokeAllActiveForUser(18L);
    }

    private User user() {
        return User.builder()
                .id(18L)
                .email("tamtm018@lms.edu.vn")
                .password("encoded-old")
                .name("Trương Mỹ Tâm")
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
