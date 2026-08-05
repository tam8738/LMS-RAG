package com.lmsrag.backend.service;

import com.lmsrag.backend.config.AiGuardProperties;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;
import java.util.function.Supplier;

/**
 * Per-user fixed-window rate limiter plus an instance-wide semaphore bulkhead.
 * The implementation is deliberately in-memory because the current deployment has one Backend instance.
 */
@Slf4j
@Component
public class AiRequestGuard {

    private static final long CLEANUP_EVERY_REQUESTS = 256;

    private final int requestsPerWindow;
    private final long windowNanos;
    private final long bulkheadWaitNanos;
    private final int maxConcurrentRequests;
    private final Semaphore bulkhead;
    private final LongSupplier nanoTime;
    private final Map<Long, RateWindow> rateWindows = new ConcurrentHashMap<>();
    private final AtomicLong requestCounter = new AtomicLong();

    public AiRequestGuard(AiGuardProperties properties) {
        this(properties, System::nanoTime);
    }

    AiRequestGuard(AiGuardProperties properties, LongSupplier nanoTime) {
        validate(properties);
        this.requestsPerWindow = properties.getRequestsPerWindow();
        this.windowNanos = properties.getWindow().toNanos();
        this.bulkheadWaitNanos = properties.getBulkheadWait().toNanos();
        this.maxConcurrentRequests = properties.getMaxConcurrentRequests();
        this.bulkhead = new Semaphore(maxConcurrentRequests, true);
        this.nanoTime = nanoTime;
    }

    public <T> T execute(Long userId, String operation, Supplier<T> action) {
        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        long now = nanoTime.getAsLong();
        RateWindow window = rateWindows.computeIfAbsent(userId, ignored -> new RateWindow(now));
        if (!window.tryConsume(now, windowNanos, requestsPerWindow)) {
            log.warn("[AI-GUARD] Rate limit exceeded | userId={} | operation={}", userId, operation);
            throw new AppException(ErrorCode.AI_RATE_LIMIT_EXCEEDED);
        }
        cleanupExpiredWindowsOccasionally(now);

        boolean acquired = tryAcquireBulkhead();
        if (!acquired) {
            log.warn("[AI-GUARD] Bulkhead full | userId={} | operation={} | activeCalls={} | queued={}",
                    userId, operation, getActiveCalls(), bulkhead.getQueueLength());
            throw new AppException(ErrorCode.AI_CAPACITY_EXCEEDED);
        }

        try {
            return action.get();
        } finally {
            bulkhead.release();
        }
    }

    int getActiveCalls() {
        return maxConcurrentRequests - bulkhead.availablePermits();
    }

    private boolean tryAcquireBulkhead() {
        try {
            if (bulkheadWaitNanos == 0) {
                return bulkhead.tryAcquire();
            }
            return bulkhead.tryAcquire(bulkheadWaitNanos, TimeUnit.NANOSECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private void cleanupExpiredWindowsOccasionally(long now) {
        if (requestCounter.incrementAndGet() % CLEANUP_EVERY_REQUESTS != 0) {
            return;
        }
        rateWindows.entrySet().removeIf(entry -> entry.getValue().isExpired(now, windowNanos));
    }

    private static void validate(AiGuardProperties properties) {
        Duration window = properties.getWindow();
        Duration wait = properties.getBulkheadWait();
        if (properties.getRequestsPerWindow() <= 0
                || window == null || window.isZero() || window.isNegative()
                || properties.getMaxConcurrentRequests() <= 0
                || wait == null || wait.isNegative()) {
            throw new IllegalArgumentException("AI guard limits must be positive and bulkhead wait cannot be negative");
        }
    }

    private static final class RateWindow {
        private long startedAtNanos;
        private int requests;

        private RateWindow(long startedAtNanos) {
            this.startedAtNanos = startedAtNanos;
        }

        private synchronized boolean tryConsume(long now, long durationNanos, int limit) {
            if (now - startedAtNanos >= durationNanos) {
                startedAtNanos = now;
                requests = 0;
            }
            if (requests >= limit) {
                return false;
            }
            requests++;
            return true;
        }

        private synchronized boolean isExpired(long now, long durationNanos) {
            return now - startedAtNanos >= durationNanos * 2;
        }
    }
}
