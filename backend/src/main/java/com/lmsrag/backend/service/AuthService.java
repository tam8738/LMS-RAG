package com.lmsrag.backend.service;

import com.lmsrag.backend.dto.LoginRequestDTO;
import com.lmsrag.backend.dto.LoginResponseDTO;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.exception.AppException;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final InMemoryBlacklistService blacklistService;


    public LoginResponseDTO login(LoginRequestDTO request) {

        System.out.println("LOGIN SERVICE CALLED");
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        String token = jwtService.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        return new LoginResponseDTO(token);
    }

//    public void logout(String token) {
//        if (!jwtService.isTokenValid(token)) {
//            throw new AppException(ErrorCode.INVALID_TOKEN);
//        }
//
//        long remainingMs = jwtService.getRemainingTime(token);
//        blacklistService.blacklistToken(token, remainingMs);
//    }
}