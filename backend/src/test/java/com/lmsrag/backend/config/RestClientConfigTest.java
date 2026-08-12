package com.lmsrag.backend.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class RestClientConfigTest {

    @Test
    void restClientBuilder_shouldSendPostBodyWithoutH2cUpgrade() throws IOException {
        AtomicReference<List<String>> upgradeHeaders = new AtomicReference<>();
        AtomicReference<List<String>> http2SettingsHeaders = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/probe", exchange -> {
            upgradeHeaders.set(exchange.getRequestHeaders().get("Upgrade"));
            http2SettingsHeaders.set(exchange.getRequestHeaders().get("HTTP2-Settings"));
            exchange.getRequestBody().readAllBytes();

            byte[] response = "ok".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, response.length);
            try (var output = exchange.getResponseBody()) {
                output.write(response);
            }
        });
        server.start();

        try {
            RestClient client = new RestClientConfig().restClientBuilder()
                    .baseUrl("http://127.0.0.1:" + server.getAddress().getPort())
                    .build();

            String response = client.post()
                    .uri("/probe")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"probe\":true}")
                    .retrieve()
                    .body(String.class);

            assertThat(response).isEqualTo("ok");
            assertThat(upgradeHeaders.get()).isNullOrEmpty();
            assertThat(http2SettingsHeaders.get()).isNullOrEmpty();
        } finally {
            server.stop(0);
        }
    }
}
