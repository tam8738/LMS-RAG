package com.lmsrag.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/** Limits expensive, synchronous calls from Backend to the AI service. */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.ai-guard")
public class AiGuardProperties {

    /** Maximum accepted AI requests per user during one fixed window. */
    private int requestsPerWindow = 10;

    /** Length of the per-user rate-limit window. */
    private Duration window = Duration.ofMinutes(1);

    /** Maximum AI calls allowed to execute concurrently in this Backend instance. */
    private int maxConcurrentRequests = 2;

    /** How long a request may wait for a bulkhead permit; zero means fail fast. */
    private Duration bulkheadWait = Duration.ZERO;
}
