package com.lmsrag.backend.dto.request.admin.teacher;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

@Schema(description = "Dữ liệu tạo hàng loạt tài khoản giảng viên")
public record TeacherBatchCreateRequest(
        @Schema(description = "Danh sách giảng viên cần tạo, tối đa 200 phần tử")
        @NotEmpty @Size(max = 200) @Valid List<TeacherCreateRequest> teachers
) {
}
