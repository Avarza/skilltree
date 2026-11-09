package dev.skilltree.practice;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Interactive practice for one skill node: a short lesson, hands-on tasks and a quiz. */
public record PracticeContent(
        @NotBlank @Size(max = 2000) String lesson,
        @NotNull @Size(min = 1, max = 6) List<@NotBlank @Size(max = 200) String> tasks,
        @NotNull @Size(max = 5) List<@Valid @NotNull QuizQuestion> quiz,
        @Min(5) @Max(90) int suggestedMinutes) {

    public record QuizQuestion(
            @NotBlank @Size(max = 300) String question,
            @NotNull @Size(min = 2, max = 4) List<@NotBlank @Size(max = 150) String> options,
            @Min(0) @Max(3) int correctIndex,
            @Size(max = 400) String explanation) {
    }
}
