package com.lmsrag.backend.dto.quiz;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class QuizGenerateRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void defaults_shouldBeValidWhenDocumentIdExists() {
        QuizGenerateRequest request = new QuizGenerateRequest();
        request.setDocumentId(10L);

        Set<ConstraintViolation<QuizGenerateRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
        assertThat(request.getQuestionCount()).isEqualTo(5);
        assertThat(request.getLanguage()).isEqualTo("vi");
    }

    @Test
    void questionCountOutsideRange_shouldBeInvalid() {
        QuizGenerateRequest request = new QuizGenerateRequest();
        request.setDocumentId(10L);
        request.setQuestionCount(11);

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("questionCount");
    }

    @Test
    void unsupportedLanguage_shouldBeInvalid() {
        QuizGenerateRequest request = new QuizGenerateRequest();
        request.setDocumentId(10L);
        request.setLanguage("fr");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("language");
    }
}
