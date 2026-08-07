package com.lmsrag.backend.exception;

import com.lmsrag.backend.dto.ApiResponse;
import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void constraintViolation_shouldReturnStructuredInvalidInputResponse() {
        DocumentCreateRequest metadata = new DocumentCreateRequest();
        metadata.setTitle(" ");
        Set<ConstraintViolation<DocumentCreateRequest>> violations = validator.validate(metadata);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/documents");

        ResponseEntity<ApiResponse<Object>> response = handler.handleConstraintViolationException(
                new ConstraintViolationException(violations),
                request
        );

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo(ErrorCode.INVALID_INPUT.getCode());
        assertThat(response.getBody().getError().getDetails())
                .extracting(ApiResponse.ErrorDetail::getField)
                .contains("title");
    }
}
