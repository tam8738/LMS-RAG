package com.lmsrag.backend.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InMemoryBlacklistService {

    // key: token, value: thời gian hết hạn (millis)
    private final Map<String, Long> blacklist = new ConcurrentHashMap<>();

    // Thêm token vào blacklist
    public void blacklistToken(String token, long expirationMs) {
        blacklist.put(token, System.currentTimeMillis() + expirationMs);
    }

    // Kiểm tra token có bị blacklist và còn hạn không
    public boolean isBlacklisted(String token) {
        Long expireTime = blacklist.get(token);
        if (expireTime == null) return false;

        if (expireTime < System.currentTimeMillis()) {
            blacklist.remove(token); // tự động xóa token hết hạn
            return false;
        }
        return true;
    }

    // Scheduled task xóa token hết hạn mỗi phút
    @Scheduled(fixedRate = 60_000)
    public void cleanExpiredTokens() {
        long now = System.currentTimeMillis();
        blacklist.entrySet().removeIf(entry -> entry.getValue() < now);
    }
}