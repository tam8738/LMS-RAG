package com.lmsrag.backend.repository;

import com.lmsrag.backend.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {

    List<QuizQuestion> findByQuizIdOrderByQuestionIndex(Long quizId);

    @Query("""
            SELECT question
            FROM QuizQuestion question
            WHERE question.quiz.id IN :quizIds
            ORDER BY question.quiz.id ASC, question.questionIndex ASC
            """)
    List<QuizQuestion> findAllByQuizIds(@Param("quizIds") List<Long> quizIds);

    void deleteByQuizId(Long quizId);
}
