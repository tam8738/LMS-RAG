package com.lmsrag.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/**
 * Cấu hình RestClient dùng chung khi Backend gọi các dịch vụ nội bộ.
 */
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient.Builder restClientBuilder() {
        // Uvicorn chỉ phục vụ HTTP/1.1 trong mô hình triển khai hiện tại. Cố gắng nâng cấp h2c
        // mặc định của Java HttpClient làm hỏng POST body trước khi FastAPI kịp định tuyến.
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();

        return RestClient.builder()
                .requestFactory(new JdkClientHttpRequestFactory(httpClient));
    }
}
