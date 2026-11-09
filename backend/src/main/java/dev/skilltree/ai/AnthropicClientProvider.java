package dev.skilltree.ai;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;

import dev.skilltree.common.ApiException;
import dev.skilltree.config.SkillTreeProperties;

/** Lazily creates one shared Claude API client from skilltree.ai.api-key (env ANTHROPIC_API_KEY). */
@Component
public class AnthropicClientProvider {

    private final SkillTreeProperties properties;
    private volatile AnthropicClient client;

    public AnthropicClientProvider(SkillTreeProperties properties) {
        this.properties = properties;
    }

    public boolean isConfigured() {
        String key = properties.ai().apiKey();
        return key != null && !key.isBlank();
    }

    public String model() {
        return properties.ai().model();
    }

    public long maxTokens() {
        return properties.ai().maxTokens();
    }

    public AnthropicClient client() {
        AnthropicClient c = client;
        if (c == null) {
            synchronized (this) {
                if (client == null) {
                    if (!isConfigured()) {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ai_not_configured",
                                "AI generation is not configured on this server");
                    }
                    client = AnthropicOkHttpClient.builder().apiKey(properties.ai().apiKey()).build();
                }
                c = client;
            }
        }
        return c;
    }
}
