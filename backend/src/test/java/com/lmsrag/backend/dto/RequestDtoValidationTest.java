package com.lmsrag.backend.dto;

import com.lmsrag.backend.dto.document.DocumentCreateRequest;
import com.lmsrag.backend.dto.document.DocumentUpdateRequest;
import com.lmsrag.backend.dto.quiz.QuizGenerateRequest;
import com.lmsrag.backend.dto.rag.RagAnswerRequest;
import com.lmsrag.backend.dto.rag.RagSendMessageRequest;
import com.lmsrag.backend.dto.request.admin.teacher.TeacherSearchRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RequestDtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void documentCreate_shouldRejectInvalidTags() {
        DocumentCreateRequest request = new DocumentCreateRequest();
        request.setTitle("Tài liệu hợp lệ");
        request.setTags(List.of("valid", " "));

        assertInvalidField(request, "tags[1].<list element>");
    }

    @Test
    void documentUpdate_shouldKeepOmittedTagsAndRejectBlankTitle() {
        DocumentUpdateRequest request = new DocumentUpdateRequest();
        request.setTitle("   ");

        assertThat(request.getTags()).isNull();
        assertInvalidField(request, "title");
    }

    @Test
    void ragAnswer_shouldRejectInvalidDocumentIdLanguageAndNullTopK() {
        RagAnswerRequest request = new RagAnswerRequest();
        request.setDocumentIds(List.of(-1L));
        request.setQuestion("Nội dung câu hỏi");
        request.setTopK(null);
        request.setLanguage("fr");

        Set<String> fields = invalidFields(request);
        assertThat(fields).contains("documentIds[0].<list element>", "topK", "language");
    }

    @Test
    void ragSendMessage_shouldRejectNullTopKAndUnsupportedLanguage() {
        RagSendMessageRequest request = new RagSendMessageRequest();
        request.setQuestion("Nội dung câu hỏi");
        request.setTopK(null);
        request.setLanguage("jp");

        assertThat(invalidFields(request)).contains("topK", "language");
    }

    @Test
    void quizGenerate_shouldRejectNonPositiveDocumentId() {
        QuizGenerateRequest request = new QuizGenerateRequest();
        request.setDocumentId(0L);

        assertInvalidField(request, "documentId");
    }

    @Test
    void teacherSearch_shouldDefaultMissingSortAndRejectUnsupportedSort() {
        TeacherSearchRequest defaults = new TeacherSearchRequest(null, null, null, null, null, null, null);
        TeacherSearchRequest invalid = new TeacherSearchRequest(null, null, null, 0, 20, "password", "sideways");

        assertThat(validator.validate(defaults)).isEmpty();
        assertThat(defaults.sortBy()).isEqualTo("createdAt");
        assertThat(defaults.sortDirection()).isEqualTo("DESC");
        assertThat(invalidFields(invalid)).contains("sortBy", "sortDirection");
    }

    private <T> void assertInvalidField(T request, String field) {
        assertThat(invalidFields(request)).contains(field);
    }

    private <T> Set<String> invalidFields(T request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }
}
