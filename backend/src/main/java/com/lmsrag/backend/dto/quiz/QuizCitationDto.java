package com.lmsrag.backend.dto.quiz;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Citation của một câu hỏi quiz. */
public record QuizCitationDto(
        @NotNull @Min(1) Long chunkId,
        @NotNull @Min(1) Long documentId,
        @Min(1) Integer pageNumber,
        @NotNull @Min(0) Integer chunkIndex,
        @NotBlank @Size(max = 500) String excerpt
) {
}
