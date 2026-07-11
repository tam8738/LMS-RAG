package com.lmsrag.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

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
     * Shared internal key để Backend gọi các internal API của AI Service.
     */
    private String internalApiKey;
}