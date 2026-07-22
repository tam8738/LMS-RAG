package com.lmsrag.backend.dto.quiz;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** Câu hỏi đầy đủ trả về cho Teacher review, gồm cả đáp án đúng và giải thích. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QuizQuestionResponse {

    private Long id;
    private Integer questionIndex;
    private String question;
    private String type;

    @Builder.Default
    private List<QuizOptionDto> options = new ArrayList<>();

    @Builder.Default
    private List<String> correctOptionIds = new ArrayList<>();

    private String explanation;

    @Builder.Default
    private List<QuizCitationDto> citations = new ArrayList<>();
}
