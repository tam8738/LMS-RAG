package com.lmsrag.backend.config;

import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.exception.ErrorResponseWriter;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.service.InMemoryBlacklistService;
import com.lmsrag.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Xác thực access token từ mỗi HTTP request và thiết lập ngữ cảnh bảo mật tương ứng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_AUTH_ENDPOINTS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/refresh/revoke"
    );

    private final JwtService jwtService;
    private final InMemoryBlacklistService blacklistService;
    private final UserRepository userRepository;
    private final ErrorResponseWriter errorResponseWriter;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_AUTH_ENDPOINTS.contains(path)
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/webjars")
                || path.startsWith("/api/v1/quiz/public/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtService.isTokenValid(token) || blacklistService.isBlacklisted(token)) {
            errorResponseWriter.write(response, ErrorCode.UNAUTHENTICATED);
            return;
        }

        try {
            if (authenticate(token, request, response)) {
                filterChain.doFilter(request, response);
            }
        } catch (RuntimeException exception) {
            log.warn("[SECURITY] JWT authentication rejected | uri={} | reason={}",
                    request.getRequestURI(), exception.getClass().getSimpleName());
            errorResponseWriter.write(response, ErrorCode.UNAUTHENTICATED);
        }
    }

    private boolean authenticate(
            String token,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            return true;
        }

        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            errorResponseWriter.write(response, ErrorCode.UNAUTHENTICATED);
            return false;
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            errorResponseWriter.write(response, ErrorCode.ACCOUNT_INACTIVE);
            return false;
        }

        CustomUserDetails userDetails = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        log.debug("[SECURITY] Request authenticated | userId={} | uri={}",
                user.getId(), request.getRequestURI());
        return true;
    }

}
