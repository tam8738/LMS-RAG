package com.lmsrag.backend.dto.response.profile;

import java.time.Instant;

public record ChangePasswordResponse(
        Instant changedAt,
        int refreshTokensRevoked
) {
}
