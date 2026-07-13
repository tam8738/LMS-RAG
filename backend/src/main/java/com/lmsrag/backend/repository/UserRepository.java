package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository quản lý thực thể {@link User}.
 * <p>
 * Kiểu khóa chính sử dụng {@link Long} để đồng bộ với field {@code id} trong entity.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
