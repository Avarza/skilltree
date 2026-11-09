package dev.skilltree.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("skilltree")
public record SkillTreeProperties(
        Jwt jwt,
        Cors cors,
        Cms cms,
        Ai ai,
        Dev dev) {

    public record Jwt(String secret, @DefaultValue("8h") Duration ttl) {
    }

    public record Cors(@DefaultValue("http://localhost:5173") List<String> allowedOrigins) {
    }

    /** requireFourEyes: the publisher must be a different person than the last editor (ADMIN may override). */
    public record Cms(@DefaultValue("true") boolean requireFourEyes) {
    }

    public record Ai(String apiKey, @DefaultValue("claude-opus-5-5") String model,
            @DefaultValue("16000") long maxTokens) {
    }

    /** Only set in local profiles; seeds an ADMIN account on startup. */
    public record Dev(String adminEmail, String adminPassword) {
    }
}
