package com.lmsrag.backend.dto.response.admin.teacher;

import lombok.Builder;

import java.util.List;

/**
 * Mô hình phản hồi phân trang dùng thống nhất cho các API quản trị.
 */
@Builder
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
