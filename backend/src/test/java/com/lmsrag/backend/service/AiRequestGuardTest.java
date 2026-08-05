package com.lmsrag.backend.service;

import com.lmsrag.backend.config.AiGuardProperties;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiRequestGuardTest {

    @Test
    void execute_shouldRateLimitPerUserAndResetAfterWindow() {
        AiGuardProperties properties = properties(2, 2);
        AtomicLong now = new AtomicLong();
        AiRequestGuard guard = new AiRequestGuard(properties, now::get);

        assertThat(guard.execute(1L, "rag", () -> "first")).isEqualTo("first");
        assertThat(guard.execute(1L, "quiz", () -> "second")).isEqualTo("second");
        assertError(
                () -> guard.execute(1L, "rag", () -> "rejected"),
                ErrorCode.AI_RATE_LIMIT_EXCEEDED
        );

        assertThat(guard.execute(2L, "rag", () -> "other-user")).isEqualTo("other-user");

        now.addAndGet(Duration.ofMinutes(1).toNanos());
        assertThat(guard.execute(1L, "rag", () -> "new-window")).isEqualTo("new-window");
    }

    @Test
    void execute_shouldFailFastWhenBulkheadIsFullAndReleasePermitAfterwards() {
        AiRequestGuard guard = new AiRequestGuard(properties(10, 1));

        String outerResult = guard.execute(1L, "rag", () -> {
            assertThat(guard.getActiveCalls()).isEqualTo(1);
            assertError(
                    () -> guard.execute(2L, "quiz", () -> "must-not-run"),
                    ErrorCode.AI_CAPACITY_EXCEEDED
            );
            return "outer";
        });

        assertThat(outerResult).isEqualTo("outer");
        assertThat(guard.getActiveCalls()).isZero();
        assertThat(guard.execute(2L, "quiz", () -> "after-release")).isEqualTo("after-release");
    }

    @Test
    void execute_shouldReleaseBulkheadWhenActionFails() {
        AiRequestGuard guard = new AiRequestGuard(properties(10, 1));

        assertThatThrownBy(() -> guard.execute(1L, "rag", () -> {
            throw new IllegalStateException("AI failed");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(guard.getActiveCalls()).isZero();
        assertThat(guard.execute(2L, "rag", () -> "recovered")).isEqualTo("recovered");
    }

    private AiGuardProperties properties(int rateLimit, int maxConcurrent) {
        AiGuardProperties properties = new AiGuardProperties();
        properties.setRequestsPerWindow(rateLimit);
        properties.setWindow(Duration.ofMinutes(1));
        properties.setMaxConcurrentRequests(maxConcurrent);
        properties.setBulkheadWait(Duration.ZERO);
        return properties;
    }

    private void assertError(Runnable action, ErrorCode expected) {
        assertThatThrownBy(action::run)
                .isInstanceOf(AppException.class)
                .satisfies(exception -> assertThat(((AppException) exception).getErrorCode()).isEqualTo(expected));
    }
}
