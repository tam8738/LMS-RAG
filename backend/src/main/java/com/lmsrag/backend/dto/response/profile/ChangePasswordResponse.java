package com.lmsrag.backend.dto.response.profile;

import java.time.Instant;

/**
 * Kết quả đổi mật khẩu và trạng thái thu hồi các phiên đăng nhập cũ.
 */

public record ChangePasswordResponse(
        Instant changedAt,
        int refreshTokensRevoked
) {
}
