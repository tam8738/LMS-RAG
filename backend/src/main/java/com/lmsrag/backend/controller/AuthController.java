package com.lmsrag.backend.controller;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    // LOGIN
    @PostMapping("/login")
    public ApiResponse<LoginResponseDTO> login(@RequestBody LoginRequestDTO request) {

        LoginResponseDTO response = authService.login(request);

        return ApiResponse.<LoginResponseDTO>builder()
                .httpStatus(200)
                .code(ErrorCode.SUCCESS.name())
                .message(ErrorCode.SUCCESS.getMessage())
                .data(response)
                .build();
    }
}
