package dev.skilltree.cms;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.springframework.stereotype.Component;

import dev.skilltree.cms.content.ContentModels.TemplateContent;
import dev.skilltree.common.ApiException;
import dev.skilltree.tree.TreeGraph;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Parses CMS content strictly into its typed model: unknown keys, wrong types and out-of-range values are rejected,
 * so only known, validated configuration can ever reach mobile clients.
 */
@Component
public class ContentValidator {

    private final ObjectMapper objectMapper;
    private final Validator validator;

    public ContentValidator(ObjectMapper objectMapper, Validator validator) {
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    /** @return canonical JSON of the validated content */
    public String validate(EntryType type, JsonNode content) {
        Object parsed = parse(type.contentClass(), content);
        List<String> errors = new ArrayList<>();
        Set<ConstraintViolation<Object>> violations = validator.validate(parsed);
        violations.forEach(v -> errors.add(v.getPropertyPath() + ": " + v.getMessage()));
        if (errors.isEmpty() && parsed instanceof TemplateContent template) {
            errors.addAll(TreeGraph.validate(template.nodes().stream()
                    .map(n -> new TreeGraph.Edge(n.id(), n.requiresOrEmpty())).toList()));
        }
        if (!errors.isEmpty()) {
            errors.sort(String::compareTo);
            throw ApiException.invalid("Content is not valid for " + type, errors);
        }
        return objectMapper.writeValueAsString(parsed);
    }

    public <T> T read(String json, Class<T> type) {
        return objectMapper.readValue(json, type);
    }

    private <T> T parse(Class<T> type, JsonNode content) {
        if (content == null || !content.isObject()) {
            throw ApiException.invalid("Content must be a JSON object", List.of());
        }
        try {
            return objectMapper.readerFor(type)
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                            DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                    .readValue(content);
        } catch (JacksonException e) {
            throw ApiException.invalid("Content has an unexpected shape", List.of(e.getOriginalMessage()));
        }
    }
}
