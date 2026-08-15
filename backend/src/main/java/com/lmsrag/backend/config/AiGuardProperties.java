package com.lmsrag.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Khai báo các giới hạn bảo vệ cho những lời gọi đồng bộ và tốn tài nguyên đến AI Service.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.ai-guard")
public class AiGuardProperties {

    /** Số yêu cầu AI tối đa của mỗi người dùng trong một cửa sổ thời gian cố định. */
    private int requestsPerWindow = 10;

    /** Độ dài cửa sổ giới hạn tần suất áp dụng riêng cho từng người dùng. */
    private Duration window = Duration.ofMinutes(1);

    /** Số lời gọi AI tối đa được chạy đồng thời trên Backend instance hiện tại. */
    private int maxConcurrentRequests = 2;

    /** Thời gian chờ quyền thực thi; giá trị bằng không sẽ từ chối ngay khi hết chỗ. */
    private Duration bulkheadWait = Duration.ZERO;
}
