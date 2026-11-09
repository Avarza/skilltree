package dev.skilltree.cms.content;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Typed shapes of CMS content. Every save is parsed strictly into one of these records (unknown keys are rejected),
 * so mobile clients only ever receive known keys with validated values.
 */
public final class ContentModels {

    private ContentModels() {
    }

    public static final String HEX = "^#[0-9A-Fa-f]{6}$";
    public static final String NODE_ID = "^[a-z0-9][a-z0-9-]{0,39}$";

    // ---- Theme -------------------------------------------------------------------------------------------------

    public record ThemeContent(
            @NotBlank @Size(max = 60) String name,
            @NotNull @Valid Palette light,
            @NotNull @Valid Palette dark,
            @NotNull @Valid Shape shape) {
    }

    public record Palette(
            @NotNull @Pattern(regexp = HEX) String primary,
            @NotNull @Pattern(regexp = HEX) String onPrimary,
            @NotNull @Pattern(regexp = HEX) String background,
            @NotNull @Pattern(regexp = HEX) String surface,
            @NotNull @Pattern(regexp = HEX) String textPrimary,
            @NotNull @Pattern(regexp = HEX) String textSecondary,
            @NotNull @Pattern(regexp = HEX) String nodeCompleted,
            @NotNull @Pattern(regexp = HEX) String nodeInProgress,
            @NotNull @Pattern(regexp = HEX) String nodeAvailable,
            @NotNull @Pattern(regexp = HEX) String nodeLocked) {
    }

    public record Shape(
            @Min(0) @Max(32) int cardRadius,
            @Min(0) @Max(4) int nodeBorderWidth,
            @NotNull @Pattern(regexp = "^(circle|rounded|hexagon)$") String nodeShape) {
    }

    // ---- Skill template ----------------------------------------------------------------------------------------

    public record TemplateContent(
            @NotBlank @Size(max = 80) String title,
            @Size(max = 500) String description,
            @NotBlank @Size(max = 40) String category,
            @Size(max = 40) String icon,
            @NotBlank @Pattern(regexp = "^[a-z]{2}$") String locale,
            @NotEmpty @Size(max = 100) List<@NotNull @Valid NodeContent> nodes) {
    }

    public record NodeContent(
            @NotNull @Pattern(regexp = NODE_ID) String id,
            @NotBlank @Size(max = 80) String title,
            @Size(max = 500) String description,
            @Min(0) @Max(10_000) int xp,
            @Size(max = 10) List<@NotNull @Pattern(regexp = NODE_ID) String> requires) {

        public List<String> requiresOrEmpty() {
            return requires == null ? List.of() : requires;
        }
    }

    // ---- App configuration -------------------------------------------------------------------------------------

    public record AppConfigContent(
            @NotBlank @Size(max = 80) String activeTheme,
            @NotNull @Valid AiGeneration aiGeneration,
            @NotNull @Valid Progression progression,
            @NotBlank @Pattern(regexp = "^[a-z]{2}$") String defaultLocale) {
    }

    public record AiGeneration(
            boolean enabled,
            @Min(0) @Max(100) int dailyLimitPerUser,
            @Min(3) @Max(60) int maxNodes) {
    }

    public record Progression(
            @Min(1) @Max(1000) int defaultNodeXp,
            @Min(50) @Max(100_000) int xpPerLevel) {
    }
}
