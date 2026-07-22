package com.lmsrag.backend.dto.request.admin.teacher;

import com.lmsrag.backend.enums.UserRole;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TeacherCreateRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void request_shouldBeValidWithNameRoleAndEmail() {
        TeacherCreateRequest request = createRequest("tam.truong@lms.edu.vn");

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void request_shouldRejectBlankEmail() {
        TeacherCreateRequest request = createRequest(" ");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email");
    }

    @Test
    void request_shouldRejectInvalidEmail() {
        TeacherCreateRequest request = createRequest("invalid-email");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email");
    }

    private TeacherCreateRequest createRequest(String email) {
        return new TeacherCreateRequest(
                "Trương Mỹ Tâm",
                UserRole.TEACHER,
                email,
                null,
                null,
                null,
                null,
                null
        );
    }
}
