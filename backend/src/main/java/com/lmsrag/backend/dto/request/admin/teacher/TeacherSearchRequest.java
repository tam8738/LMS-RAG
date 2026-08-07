package com.lmsrag.backend.dto.request.admin.teacher;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.util.Locale;

@Builder
public record TeacherSearchRequest(
        @Size(max = 200, message = "Từ khóa tìm kiếm tối đa 200 ký tự") String keyword,
        Boolean isActive,
        @Size(max = 255, message = "Khoa hoặc bộ môn tối đa 255 ký tự") String department,
        @Min(value = 0, message = "Số trang không được âm") Integer page,
        @Min(value = 1, message = "Kích thước trang phải từ 1 đến 100")
        @Max(value = 100, message = "Kích thước trang phải từ 1 đến 100") Integer size,
        @Pattern(regexp = "^(name|email|createdAt|updatedAt)$",
                message = "Trường sắp xếp không hợp lệ") String sortBy,
        @Pattern(regexp = "^(ASC|DESC)$",
                message = "Chiều sắp xếp chỉ nhận ASC hoặc DESC") String sortDirection
) {
    public TeacherSearchRequest {
        if (page == null) page = 0;
        if (size == null) size = 20;
        if (sortBy == null || sortBy.isBlank()) sortBy = "createdAt";
        if (sortDirection == null || sortDirection.isBlank()) sortDirection = "DESC";
        else sortDirection = sortDirection.toUpperCase(Locale.ROOT);
    }
}
