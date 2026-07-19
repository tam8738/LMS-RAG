package com.lmsrag.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu thay đổi mật khẩu")
public class ChangePasswordRequestDTO {

    @Schema(description = "Mật khẩu hiện tại", example = "password123")
    private String currentPassword;

    @Schema(description = "Mật khẩu mới", example = "newpassword123")
    private String newPassword;
}
