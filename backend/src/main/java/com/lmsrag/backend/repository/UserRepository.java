package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.User;
import com.lmsrag.backend.enums.UserRole;
import com.lmsrag.backend.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Repository quản lý thực thể {@link User}.
 * <p>
 * Kiểu khóa chính sử dụng {@link Long} để đồng bộ với field {@code id} trong entity.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("""
            SELECT u FROM User u
            WHERE u.role = :role
              AND (:status IS NULL OR u.status = :status)
              AND (:keyword IS NULL OR
                   LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(u.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:department IS NULL OR LOWER(COALESCE(u.department, '')) LIKE LOWER(CONCAT('%', :department, '%')))
            """)
    Page<User> searchByRole(@Param("role") UserRole role,
                            @Param("status") UserStatus status,
                            @Param("keyword") String keyword,
                            @Param("department") String department,
                            Pageable pageable);

    @Query("""
            SELECT u FROM User u
            WHERE u.role = :role
              AND u.id = :id
            """)
    Optional<User> findByIdAndRole(@Param("id") Long id, @Param("role") UserRole role);
}
