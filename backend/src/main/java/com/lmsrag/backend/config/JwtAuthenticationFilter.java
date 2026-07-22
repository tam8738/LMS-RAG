package com.lmsrag.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserStatus;
import com.lmsrag.backend.exception.ErrorCode;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.service.InMemoryBlacklistService;
import com.lmsrag.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

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
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return PUBLIC_AUTH_ENDPOINTS.contains(path)
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/webjars");
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
            writeError(response, ErrorCode.UNAUTHENTICATED);
            return;
        }

        try {
            if (authenticate(token, request, response)) {
                filterChain.doFilter(request, response);
            }
        } catch (RuntimeException exception) {
            log.warn("[SECURITY] JWT authentication rejected | uri={} | reason={}",
                    request.getRequestURI(), exception.getClass().getSimpleName());
            writeError(response, ErrorCode.UNAUTHENTICATED);
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
            writeError(response, ErrorCode.UNAUTHENTICATED);
            return false;
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            writeError(response, ErrorCode.ACCOUNT_INACTIVE);
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

    private void writeError(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(errorCode.getStatusCode());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiResponse.error(errorCode.getCode(), errorCode.getMessage())
        );
    }
}
