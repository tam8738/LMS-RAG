package com.lmsrag.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Envelope chuẩn cho mọi response trả về từ API.
 *
 * Response thành công:
 * { "success": true, "data": {...}, "message": "...", "meta": {...} }
 *
 * Response lỗi:
 * { "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
 *
 * Các field null sẽ tự động bị loại khỏi JSON output nhờ @JsonInclude(NON_NULL),
 * nên response thành công sẽ không có field "error" và ngược lại.
 *
 * @param <T> kiểu dữ liệu trả về trong field "data"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    /** true nếu request xử lý thành công, false nếu có lỗi */
    private boolean success;

    /** Dữ liệu trả về khi thành công (null nếu lỗi) */
    private T data;

    /** Thông điệp mô tả ngắn gọn (optional), dùng cho cả 2 trường hợp thành công/lỗi */
    private String message;

    /** Thông tin phân trang/metadata, chỉ dùng cho response thành công có dạng danh sách */
    private Meta meta;

    /** Thông tin chi tiết lỗi, chỉ xuất hiện khi success = false */
    private ErrorInfo error;

    // =========================================================
    // ===== Success factory methods =====
    // =========================================================

    /** Thành công, chỉ trả data */
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    /** Thành công, có kèm message mô tả (vd: "Tạo user thành công") */
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .build();
    }

    /** Thành công, có message và thông tin phân trang */
    public static <T> ApiResponse<T> success(T data, String message, Meta meta) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .meta(meta)
                .build();
    }

    /** Thành công, có thông tin phân trang nhưng không cần message */
    public static <T> ApiResponse<T> success(T data, Meta meta) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .meta(meta)
                .build();
    }

    // =========================================================
    // ===== Error factory methods =====
    // =========================================================

    /** Lỗi đơn giản, không có chi tiết theo field (vd: lỗi nghiệp vụ từ AppException) */
    public static <T> ApiResponse<T> error(String code, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorInfo.builder()
                        .code(code)
                        .message(message)
                        .build())
                .build();
    }

    /** Lỗi có danh sách chi tiết theo từng field (vd: lỗi validate dữ liệu đầu vào) */
    public static <T> ApiResponse<T> error(String code, String message, List<ErrorDetail> details) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(ErrorInfo.builder()
                        .code(code)
                        .message(message)
                        .details(details)
                        .build())
                .build();
    }

    // =========================================================
    // ===== Nested types =====
    // =========================================================

    /** Thông tin phân trang đính kèm response danh sách */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Meta {
        /** Tổng số bản ghi */
        private Long total;
        /** Trang hiện tại (bắt đầu từ 1) */
        private Integer page;
        /** Số bản ghi mỗi trang */
        private Integer limit;
        /** Tổng số trang */
        private Integer totalPages;
    }

    /** Thông tin lỗi: mã lỗi, thông điệp và danh sách chi tiết (nếu có) */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorInfo {
        /** Mã lỗi (vd: "EMAIL_EXISTED", "INVALID_INPUT") dùng để FE xử lý logic theo mã */
        private String code;
        /** Thông điệp lỗi mô tả rõ ràng, có thể hiển thị trực tiếp cho người dùng */
        private String message;
        /** Danh sách lỗi chi tiết theo từng field, dùng cho lỗi validate dữ liệu đầu vào */
        private List<ErrorDetail> details;
    }

    /** Lỗi của một field cụ thể, dùng trong validate request */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ErrorDetail {
        /** Tên field bị lỗi (vd: "email") */
        private String field;
        /** Thông điệp lỗi của field đó (vd: "Email không hợp lệ") */
        private String message;
    }
}