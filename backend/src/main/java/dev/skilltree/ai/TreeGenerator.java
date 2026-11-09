package dev.skilltree.ai;

import java.util.List;

/** Generates a skill tree for a topic. Implemented by {@link ClaudeTreeGenerator}; replaceable with a fake in tests. */
public interface TreeGenerator {

    Result generate(Request request);

    record Request(String topic, String level, String goal, String locale, int maxNodes) {
    }

    record GeneratedNode(String id, String title, String description, int xp, List<String> requires) {
    }

    record Result(String title, String description, List<GeneratedNode> nodes, String model, Long inputTokens,
            Long outputTokens) {
    }
}
