package com.lmsrag.backend.service;

import com.lmsrag.backend.entity.RefreshToken;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(refreshTokenRepository);
        ReflectionTestUtils.setField(refreshTokenService, "expirationMs", 3_600_000L);
    }

    @Test
    void issue_shouldPersistOnlyHashAndReturnRawToken() {
        User user = activeUser();

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.issue(user);

        ArgumentCaptor<RefreshToken> tokenCaptor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(tokenCaptor.capture());
        RefreshToken persisted = tokenCaptor.getValue();

        assertThat(issued.value()).isNotBlank();
        assertThat(persisted.getTokenHash())
                .hasSize(64)
                .isNotEqualTo(issued.value());
        assertThat(persisted.getUser()).isSameAs(user);
        assertThat(issued.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void rotate_shouldRevokeOldTokenAndIssueReplacement() {
        User user = activeUser();
        RefreshToken current = RefreshToken.builder()
                .id(10L)
                .user(user)
                .tokenHash("stored-hash")
                .expiresAt(Instant.now().plusSeconds(600))
                .build();
        when(refreshTokenRepository.findByTokenHashForUpdate(any()))
                .thenReturn(Optional.of(current));

        RefreshTokenService.IssuedRefreshToken replacement = refreshTokenService.rotate("raw-token");

        assertThat(current.getRevokedAt()).isNotNull();
        assertThat(replacement.user()).isSameAs(user);
        assertThat(replacement.value()).isNotEqualTo("raw-token");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void rotate_shouldRejectRevokedTokenWithoutIssuingReplacement() {
        RefreshToken revoked = RefreshToken.builder()
                .user(activeUser())
                .expiresAt(Instant.now().plusSeconds(600))
                .revokedAt(Instant.now())
                .build();
        when(refreshTokenRepository.findByTokenHashForUpdate(any()))
                .thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> refreshTokenService.rotate("reused-token"))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_REFRESH_TOKEN));

        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    void revoke_shouldBeIdempotentWhenTokenDoesNotExist() {
        when(refreshTokenRepository.findByTokenHashForUpdate(any()))
                .thenReturn(Optional.empty());

        refreshTokenService.revoke("unknown-token");

        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    private User activeUser() {
        return User.builder()
                .id(18L)
                .email("tamtm018@lms.edu.vn")
                .name("Trương Mỹ Tâm")
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
