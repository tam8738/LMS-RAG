package com.lmsrag.backend.service;

import com.lmsrag.backend.entity.RefreshToken;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 48;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${security.refresh-token.expiration-ms:2592000000}")
    private long expirationMs;

    @Transactional
    public IssuedRefreshToken issue(User user) {
        return createToken(user, Instant.now());
    }

    @Transactional
    public IssuedRefreshToken rotate(String rawToken) {
        Instant now = Instant.now();
        RefreshToken currentToken = refreshTokenRepository
                .findByTokenHashForUpdate(hash(rawToken))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (!currentToken.isUsableAt(now)) {
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        User user = currentToken.getUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.ACCOUNT_INACTIVE);
        }

        currentToken.setRevokedAt(now);
        IssuedRefreshToken replacement = createToken(user, now);
        log.info("[AUTH] Rotated refresh token | userId={} | previousTokenId={}",
                user.getId(), currentToken.getId());
        return replacement;
    }

    @Transactional
    public void revoke(String rawToken) {
        String tokenHash = hash(rawToken);
        refreshTokenRepository.findByTokenHashForUpdate(tokenHash)
                .ifPresent(token -> {
                    if (token.getRevokedAt() == null) {
                        token.setRevokedAt(Instant.now());
                        log.info("[AUTH] Revoked refresh token | userId={} | tokenId={}",
                                token.getUser().getId(), token.getId());
                    }
                });
    }

    @Transactional
    public int revokeAllActiveForUser(Long userId) {
        return refreshTokenRepository.revokeAllActiveByUserId(userId, Instant.now());
    }

    private IssuedRefreshToken createToken(User user, Instant issuedAt) {
        String rawToken = generateSecureToken();
        Instant expiresAt = issuedAt.plusMillis(expirationMs);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(expiresAt)
                .build());

        return new IssuedRefreshToken(user, rawToken, expiresAt);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public record IssuedRefreshToken(
            User user,
            String value,
            Instant expiresAt
    ) {
    }
}
