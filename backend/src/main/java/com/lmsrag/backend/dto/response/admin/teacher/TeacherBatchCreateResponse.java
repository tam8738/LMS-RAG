package com.lmsrag.backend.dto.response.admin.teacher;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.util.List;

@Builder
@Schema(description = "Kết quả tạo hàng loạt tài khoản giảng viên")
public record TeacherBatchCreateResponse(
        int totalRequested,
        int successCount,
        int failureCount,
        List<TeacherResponse> created,
        List<BatchItemError> errors
) {

    @Builder
    @Schema(description = "Chi tiết một phần tử tạo không thành công")
    public record BatchItemError(
            int index,
            String name,
            String email,
            String errorCode,
            String message
    ) {
    }
}
