package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Long> {

    List<Quiz> findByCreatedByIdOrderByCreatedAtDesc(Long createdById);

    Optional<Quiz> findByIdAndCreatedById(Long id, Long createdById);
}
