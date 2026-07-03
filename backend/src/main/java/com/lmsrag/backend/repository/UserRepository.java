package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository cho entity User.
 * Sửa từ JpaRepository<User, Integer> thành Long để khớp với @Id Long id trong entity.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}