package com.lmsrag.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Ánh xạ cấu hình kết nối, thời gian chờ và endpoint của AI Service.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.ai-service")
public class AiServiceProperties {

    /**
     * Base URL của AI Service.
     * Docker: http://ai-service:8000
     * Local dev: http://localhost:8000
     */
    private String baseUrl = "http://localhost:8000";

    /**
     * Khóa nội bộ dùng chung để Backend gọi các API riêng của AI Service.
     */
    private String internalApiKey;
}
