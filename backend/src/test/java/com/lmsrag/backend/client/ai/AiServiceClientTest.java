package com.lmsrag.backend.client.ai;

import com.lmsrag.backend.config.AiServiceProperties;
import com.lmsrag.backend.dto.ai.AiGenerateQuizResult;
import com.lmsrag.backend.dto.ai.AiQuizCitation;
import com.lmsrag.backend.dto.ai.AiQuizOption;
import com.lmsrag.backend.dto.ai.AiQuizQuestion;
import com.lmsrag.backend.dto.ai.AiSuccessResponse;
import com.lmsrag.backend.entity.Document;
import com.lmsrag.backend.enums.DocumentFileType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class AiServiceClientTest {

    private final AiServiceClient client = new AiServiceClient(
            new AiServiceProperties(),
            RestClient.builder(),
            Runnable::run
    );

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

    @Test
    void analyzeDocumentAsync_shouldUseRestClientAndBoundedExecutor() {
        AiServiceProperties properties = new AiServiceProperties();
        properties.setInternalApiKey("test-internal-key");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        AiServiceClient restClient = new AiServiceClient(properties, builder, Runnable::run);

        server.expect(once(), requestTo("http://localhost:8000/v1/analyze-document"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Internal-Key", "test-internal-key"))
                .andRespond(withSuccess("""
                        {
                          "success": true,
                          "data": {
                            "document_id": 7,
                            "can_rag": true,
                            "rag_status": "READY",
                            "page_count": 3,
                            "estimated_token_count": 1200,
                            "estimated_chunk_count": 4
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        Document document = Document.builder()
                .id(7L)
                .storageKey("documents/7/test.pdf")
                .fileType(DocumentFileType.PDF)
                .build();

        assertThat(restClient.analyzeDocumentAsync(document).join())
                .satisfies(result -> {
                    assertThat(result.getDocumentId()).isEqualTo(7L);
                    assertThat(result.getCanRag()).isTrue();
                    assertThat(result.getEstimatedChunkCount()).isEqualTo(4);
                });
        server.verify();
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
