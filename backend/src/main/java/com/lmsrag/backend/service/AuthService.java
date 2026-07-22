package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.AuthUserResponse;
import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final InMemoryBlacklistService blacklistService;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public LoginResponseDTO login(LoginRequestDTO request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (request.getPassword().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES
                || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
        ensureAccountIsActive(user);

        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.issue(user);
        LoginResponseDTO response = createTokenResponse(user, refreshToken);
        log.info("[AUTH] Login succeeded | userId={}", user.getId());
        return response;
    }

    @Transactional
    public LoginResponseDTO refresh(String rawRefreshToken) {
        RefreshTokenService.IssuedRefreshToken refreshToken = refreshTokenService.rotate(rawRefreshToken);
        User user = refreshToken.user();
        LoginResponseDTO response = createTokenResponse(user, refreshToken);
        log.info("[AUTH] Access token refreshed | userId={}", user.getId());
        return response;
    }

    @Transactional
    public void revokeRefreshToken(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    @Transactional(readOnly = true)
    public AuthUserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return mapToAuthUserResponse(user);
    }

    public void logout(String token) {
        if (!jwtService.isTokenValid(token)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        long remainingTime = jwtService.getRemainingTime(token);
        blacklistService.blacklistToken(token, remainingTime);
        log.info("[AUTH] Access token revoked until expiration");
    }

    private LoginResponseDTO createTokenResponse(
            User user,
            RefreshTokenService.IssuedRefreshToken refreshToken
    ) {
        String accessToken = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return LoginResponseDTO.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.value())
                .tokenType("Bearer")
                .accessTokenExpiresInSeconds(jwtService.getExpirationSeconds())
                .refreshTokenExpiresAt(refreshToken.expiresAt())
                .user(mapToAuthUserResponse(user))
                .build();
    }

    private void ensureAccountIsActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.ACCOUNT_INACTIVE);
        }
    }

    private AuthUserResponse mapToAuthUserResponse(User user) {
        return AuthUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
