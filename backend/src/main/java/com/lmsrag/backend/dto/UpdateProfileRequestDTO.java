package com.lmsrag.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu cập nhật thông tin cá nhân")
public class UpdateProfileRequestDTO {
    
    @Schema(description = "Họ và tên mới", example = "Nguyễn Văn A")
    private String name;
}
