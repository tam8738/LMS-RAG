package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.AuthUserResponse;
import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Tầng xử lý nghiệp vụ xác thực (authentication).
 * <p>
 * Chịu trách nhiệm:
 * <ul>
 *     <li>Đăng nhập và sinh JWT token</li>
 *     <li>Lấy thông tin tài khoản hiện tại dựa trên email từ SecurityContext</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final InMemoryBlacklistService blacklistService;

    /**
     * Xác thực tài khoản và trả về JWT token kèm thông tin cơ bản.
     *
     * @param request thông tin đăng nhập (email + password)
     * @return {@link LoginResponseDTO} chứa access token và thông tin tài khoản
     */
    public LoginResponseDTO login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        String accessToken = jwtService.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        return LoginResponseDTO.builder()
                .accessToken(accessToken)
                .user(mapToAuthUserResponse(user))
                .build();
    }

    /**
     * Lấy thông tin tài khoản hiện tại dựa trên email đã xác thực.
     *
     * @param email email của tài khoản đang đăng nhập
     * @return {@link AuthUserResponse} thông tin tài khoản
     */
    public AuthUserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return mapToAuthUserResponse(user);
    }

    /**
     * Đăng xuất bằng cách thêm JWT token hiện tại vào blacklist.
     * Token sẽ bị từ chối ở các request sau ngay cả khi chưa hết hạn.
     *
     * @param token JWT access token cần đăng xuất
     */
    public void logout(String token) {
        if (!jwtService.isTokenValid(token)) {
            throw new AppException(ErrorCode.INVALID_TOKEN);
        }

        long remainingTime = jwtService.getRemainingTime(token);
        blacklistService.blacklistToken(token, remainingTime);
    }

    /**
     * Ánh xạ entity {@link User} sang {@link AuthUserResponse}.
     * <p>
     * Tách riêng helper để tái sử dụng cho cả login và /me, tránh duplicate code.
     *
     * @param user entity cần ánh xạ
     * @return DTO thông tin tài khoản
     */
    private AuthUserResponse mapToAuthUserResponse(User user) {
        return AuthUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
