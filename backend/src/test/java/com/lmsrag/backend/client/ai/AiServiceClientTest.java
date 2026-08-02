package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
import com.lmsrag.backend.dto.ai.AiGenerateQuizResult;
import com.lmsrag.backend.dto.ai.AiQuizCitation;
import com.lmsrag.backend.dto.ai.AiQuizOption;
import com.lmsrag.backend.dto.ai.AiQuizQuestion;
import com.lmsrag.backend.dto.ai.AiSuccessResponse;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiServiceClientTest {

    private final AiServiceClient client = new AiServiceClient(new AiServiceProperties(), WebClient.builder());

    @Test
    void requireQuizData_shouldAcceptTwentyQuestions() {
        AiSuccessResponse<AiGenerateQuizResult> response = successResponse(20);

        AiGenerateQuizResult result = ReflectionTestUtils.invokeMethod(client, "requireQuizData", response);

        assertThat(result).isNotNull();
        assertThat(result.questions()).hasSize(20);
    }

    @Test
    void requireQuizData_shouldRejectMoreThanTwentyQuestions() {
        AiSuccessResponse<AiGenerateQuizResult> response = successResponse(21);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(client, "requireQuizData", response))
                .isInstanceOf(AiServiceException.class)
                .extracting(error -> ((AiServiceException) error).getErrorCode())
                .isEqualTo("AI_INVALID_RESPONSE");
    }

    private static AiSuccessResponse<AiGenerateQuizResult> successResponse(int questionCount) {
        AiSuccessResponse<AiGenerateQuizResult> response = new AiSuccessResponse<>();
        response.setSuccess(true);
        response.setData(new AiGenerateQuizResult(
                "Quiz test",
                "Quiz test description",
                questions(questionCount),
                1000
        ));
        return response;
    }

    private static List<AiQuizQuestion> questions(int count) {
        List<AiQuizQuestion> questions = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            questions.add(new AiQuizQuestion(
                    "Question " + (index + 1) + "?",
                    "single_choice",
                    List.of(
                            new AiQuizOption("A", "Option A"),
                            new AiQuizOption("B", "Option B"),
                            new AiQuizOption("C", "Option C"),
                            new AiQuizOption("D", "Option D")
                    ),
                    List.of("A"),
                    "Grounded explanation.",
                    List.of(new AiQuizCitation(1L, 10L, 1, index, "Test citation"))
            ));
        }
        return questions;
    }
}