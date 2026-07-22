package com.lmsrag.backend.dto.quiz;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.lmsrag.backend.enums.QuizStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Quiz đầy đủ trả về Frontend cho Teacher review. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuizResponse {

    private Long id;
    private Long documentId;
    private Long createdById;
    private String title;
    private String description;
    private QuizStatus status;
    private Integer questionCount;
    private String language;
    private Integer tokensUsed;
    private Instant publishedAt;
    private Instant createdAt;
    private Instant updatedAt;

    @Builder.Default
    private List<QuizQuestionResponse> questions = new ArrayList<>();
}
