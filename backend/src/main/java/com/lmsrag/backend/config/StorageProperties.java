package com.lmsrag.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Ánh xạ cấu hình thư mục và giới hạn lưu trữ tài liệu.
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    /**
     * Thư mục gốc để lưu file upload.
     * Trong Docker: /storage/uploads
     * Local dev: ./uploads
     */
    private String uploadRoot = "./uploads";
}
