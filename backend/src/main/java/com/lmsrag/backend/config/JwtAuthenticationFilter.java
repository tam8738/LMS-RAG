package com.lmsrag.backend.config;


import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.repository.UserRepository;
import com.lmsrag.backend.service.InMemoryBlacklistService;
import com.lmsrag.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final InMemoryBlacklistService blacklistService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        System.out.println(">>> JwtFilter chạy: " + request.getRequestURI());

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.replace("Bearer ", "");

            System.out.println("Token: " + token);

            if (!jwtService.isTokenValid(token) || blacklistService.isBlacklisted(token)) {

                System.out.println("Token nằm trong blacklist");

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Unauthorized: token invalid or blacklisted");
                return;
            }
            // Lấy email và role từ token
            String email = jwtService.extractEmail(token);
            String role = jwtService.extractRole(token);

            System.out.println("Username: " + email);
            System.out.println("Role: " + role);

            // Tránh null gây crash
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                CustomUserDetails userDetails = new CustomUserDetails(user);

//                List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));

                System.out.println("Authorities: " + userDetails.getAuthorities());

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                SecurityContextHolder.getContext().setAuthentication(authToken);

                var auth = SecurityContextHolder.getContext().getAuthentication();
                System.out.println(">>> AFTER SET AUTH");
                System.out.println("Principal: " + auth.getPrincipal());
                System.out.println("Authorities: " + auth.getAuthorities());
                System.out.println("isAuthenticated: " + auth.isAuthenticated());
                System.out.println("Đã set Authentication");
            }
        }
        filterChain.doFilter(request, response);
        var authAfter = SecurityContextHolder.getContext().getAuthentication();
        System.out.println(">>> AFTER FILTER CHAIN");
        System.out.println("Principal: " + (authAfter != null ? authAfter.getPrincipal() : null));
        System.out.println("Authorities: " + (authAfter != null ? authAfter.getAuthorities() : null));
    }

}
