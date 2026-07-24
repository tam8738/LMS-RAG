package com.lmsrag.backend.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmsrag.backend.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Utility dùng để ghi response lỗi dạng JSON trong các filter và security handler.
 * <p>
 * Các filter/handler không thể return object như @RestController, nên cần viết trực tiếp
 * vào {@link HttpServletResponse}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ErrorResponseWriter {

    private final ObjectMapper objectMapper;

    /**
     * Ghi lỗi dạng JSON vào response.
     *
     * @param response  response cần ghi
     * @param errorCode mã lỗi cùng HTTP status
     * @throws IOException nếu ghi response thất bại
     */
    public void write(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        if (response.isCommitted()) {
            log.warn("[ERROR_RESPONSE] Response already committed, cannot write error: {}", errorCode);
            return;
        }

        response.setStatus(errorCode.getStatusCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiResponse.error(errorCode.getCode(), errorCode.getMessage())
        );
    }
}
