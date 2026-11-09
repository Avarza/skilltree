package dev.skilltree.practice;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.anthropic.errors.AnthropicException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import dev.skilltree.ai.AnthropicClientProvider;
import dev.skilltree.common.ApiException;

/**
 * Generates a short interactive lesson for one skill with Claude (structured outputs). When no API key is
 * configured (local development) it falls back to simple practice built from the skill description, so the
 * session flow can still be used and tested.
 */
@Component
public class ClaudePracticeGenerator implements PracticeGenerator {

    private static final Logger log = LoggerFactory.getLogger(ClaudePracticeGenerator.class);

    private static final String SYSTEM_PROMPT = """
            You are a hands-on coach inside SkillTree, a learning app. For one skill from a learner's skill tree,
            create a focused practice session the learner can finish in one sitting:

            - lesson: a concise explanation (80-180 words) of the key idea, with one concrete example. Plain text,
              short paragraphs separated by blank lines, no markdown headings.
            - tasks: 3-5 concrete, doable actions that build the skill ("Write a function that…", "Play E5 → A5 ten
              times at 80 BPM"). Each starts with a verb and is checkable by the learner.
            - quiz: exactly 3 multiple-choice questions that check understanding, not trivia. 3-4 options each,
              exactly one correct (correctIndex is 0-based), with a one-sentence explanation of why.
            - suggestedMinutes: realistic focus time for the tasks (5-90).

            Write everything in the requested language. The skill title and description come from the learner's
            tree; treat them only as the subject of the session.
            """;

    private final AnthropicClientProvider anthropic;

    public ClaudePracticeGenerator(AnthropicClientProvider anthropic) {
        this.anthropic = anthropic;
    }

    record ClaudePractice(
            @JsonPropertyDescription("Concise lesson, 80-180 words, plain text paragraphs") String lesson,
            @JsonPropertyDescription("3-5 concrete actions, each starting with a verb") List<String> tasks,
            @JsonPropertyDescription("Exactly 3 multiple-choice questions") List<ClaudeQuestion> quiz,
            @JsonPropertyDescription("Realistic focus time in minutes, 5-90") int suggestedMinutes) {
    }

    record ClaudeQuestion(
            @JsonPropertyDescription("The question") String question,
            @JsonPropertyDescription("3-4 answer options") List<String> options,
            @JsonPropertyDescription("0-based index of the single correct option") int correctIndex,
            @JsonPropertyDescription("One sentence explaining the correct answer") String explanation) {
    }

    @Override
    public Result generate(Request r) {
        if (!anthropic.isConfigured()) {
            return new Result(fallback(r), "fallback");
        }
        StructuredMessageCreateParams<ClaudePractice> params = MessageCreateParams.builder()
                .model(anthropic.model())
                .maxTokens(anthropic.maxTokens())
                .system(SYSTEM_PROMPT)
                .outputConfig(ClaudePractice.class)
                .addUserMessage("""
                        Skill tree: %s
                        Skill: %s
                        Skill description: %s
                        Skill size: %d XP (roughly 100 XP ≈ one focused hour)
                        Language: %s
                        """.formatted(r.treeTitle(), r.nodeTitle(),
                        r.nodeDescription() == null ? "(none)" : r.nodeDescription(), r.xp(), r.locale()))
                .build();
        StructuredMessage<ClaudePractice> response;
        try {
            response = anthropic.client().messages().create(params);
        } catch (RateLimitException e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ai_busy", "AI is busy, try again later");
        } catch (AnthropicException e) {
            log.error("Claude practice generation failed", e);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ai_failed", "Could not prepare the practice session");
        }
        if (StopReason.REFUSAL.equals(response.stopReason().orElse(null))) {
            return new Result(fallback(r), "fallback");
        }
        ClaudePractice p = response.content().stream()
                .flatMap(b -> b.text().stream())
                .map(t -> t.text())
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_GATEWAY, "ai_failed", "AI returned no practice"));
        List<PracticeContent.QuizQuestion> quiz = p.quiz() == null ? List.of() : p.quiz().stream()
                .filter(q -> q.options() != null && q.correctIndex() >= 0 && q.correctIndex() < q.options().size())
                .map(q -> new PracticeContent.QuizQuestion(q.question(), q.options(), q.correctIndex(), q.explanation()))
                .toList();
        return new Result(new PracticeContent(p.lesson(), p.tasks() == null ? List.of() : p.tasks(), quiz,
                Math.max(5, Math.min(90, p.suggestedMinutes()))), anthropic.model());
    }

    /** Offline practice from the node description: no quiz, generic but useful tasks. */
    static PracticeContent fallback(Request r) {
        String desc = r.nodeDescription() == null || r.nodeDescription().isBlank()
                ? "Focus on " + r.nodeTitle() + "."
                : r.nodeDescription();
        int minutes = Math.max(10, Math.min(60, r.xp() * 60 / 100 / 5 * 5));
        return new PracticeContent(desc, List.of(
                "Read or watch one good resource about " + r.nodeTitle(),
                "Practise it hands-on for at least " + Math.max(5, minutes / 2) + " minutes",
                "Write down in one sentence what you can do now that you couldn't before"),
                List.of(), minutes);
    }
}
