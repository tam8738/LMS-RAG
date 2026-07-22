package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.entity.User;
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

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private InMemoryBlacklistService blacklistService;

    @Mock
    private RefreshTokenService refreshTokenService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordEncoder,
                jwtService,
                blacklistService,
                refreshTokenService
        );
    }

    @Test
    void login_shouldReturnAccessAndRefreshTokens() {
        User user = activeUser();
        LoginRequestDTO request = loginRequest("  TAMTM018@LMS.EDU.VN  ", "password");
        Instant refreshExpiresAt = Instant.now().plusSeconds(3600);
        when(userRepository.findByEmail("tamtm018@lms.edu.vn")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "encoded-password")).thenReturn(true);
        when(refreshTokenService.issue(user)).thenReturn(
                new RefreshTokenService.IssuedRefreshToken(user, "refresh-token", refreshExpiresAt)
        );
        when(jwtService.generateToken(user.getEmail(), "TEACHER")).thenReturn("access-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        LoginResponseDTO response = authService.login(request);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("refresh-token");
        assertThat(response.getAccessTokenExpiresInSeconds()).isEqualTo(3600L);
        assertThat(response.getRefreshTokenExpiresAt()).isEqualTo(refreshExpiresAt);
        assertThat(response.getUser().getId()).isEqualTo(18L);
    }

    @Test
    void refresh_shouldRotateRefreshTokenAndReturnNewPair() {
        User user = activeUser();
        Instant expiresAt = Instant.now().plusSeconds(3600);
        when(refreshTokenService.rotate("old-refresh-token")).thenReturn(
                new RefreshTokenService.IssuedRefreshToken(user, "new-refresh-token", expiresAt)
        );
        when(jwtService.generateToken(user.getEmail(), "TEACHER")).thenReturn("new-access-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        LoginResponseDTO response = authService.refresh("old-refresh-token");

        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
        verify(refreshTokenService).rotate("old-refresh-token");
    }

    @Test
    void login_shouldRejectInactiveAccountBeforeIssuingToken() {
        User user = activeUser();
        user.setStatus(UserStatus.INACTIVE);
        LoginRequestDTO request = loginRequest(user.getEmail(), "password");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "encoded-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(AppException.class)
                .satisfies(error -> assertThat(((AppException) error).getErrorCode())
                        .isEqualTo(ErrorCode.ACCOUNT_INACTIVE));

        verify(refreshTokenService, never()).issue(user);
    }

    private LoginRequestDTO loginRequest(String email, String password) {
        LoginRequestDTO request = new LoginRequestDTO();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private User activeUser() {
        return User.builder()
                .id(18L)
                .email("tamtm018@lms.edu.vn")
                .password("encoded-password")
                .name("Trương Mỹ Tâm")
                .role(UserRole.TEACHER)
                .status(UserStatus.ACTIVE)
                .build();
    }
}
