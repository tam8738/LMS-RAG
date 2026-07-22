package com.lmsrag.backend.dto.request.admin.teacher;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Builder;

import java.util.Set;

@Builder
public record TeacherSearchRequest(
        String keyword,
        Boolean isActive,
        String department,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size,
        String sortBy,
        String sortDirection
) {
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("name", "email", "createdAt", "updatedAt");
    private static final Set<String> ALLOWED_SORT_DIRECTIONS = Set.of("ASC", "DESC");

    public TeacherSearchRequest {
        if (page == null) page = 0;
        if (size == null) size = 20;
        if (sortBy == null || !ALLOWED_SORT_FIELDS.contains(sortBy)) sortBy = "createdAt";
        if (sortDirection == null || !ALLOWED_SORT_DIRECTIONS.contains(sortDirection.toUpperCase())) {
            sortDirection = "DESC";
        } else {
            sortDirection = sortDirection.toUpperCase();
        }
    }
}
