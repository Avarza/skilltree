package dev.skilltree.release;

import java.util.Optional;

import org.springframework.stereotype.Component;

import dev.skilltree.cms.content.ContentModels.AppConfigContent;
import dev.skilltree.cms.content.ContentModels.TemplateContent;
import dev.skilltree.common.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Server-side view of the latest published snapshot, so the API enforces exactly what clients were told. */
@Component
public class PublishedContent {

    private final ReleaseService releaseService;
    private final ObjectMapper objectMapper;

    public PublishedContent(ReleaseService releaseService, ObjectMapper objectMapper) {
        this.releaseService = releaseService;
        this.objectMapper = objectMapper;
    }

    public AppConfigContent appConfig() {
        return objectMapper.treeToValue(snapshot().get("config"), AppConfigContent.class);
    }

    public Optional<TemplateContent> template(String slug) {
        for (JsonNode t : snapshot().get("templates")) {
            if (slug.equals(t.get("slug").asString())) {
                JsonNode copy = t.deepCopy();
                ((tools.jackson.databind.node.ObjectNode) copy).remove("slug");
                return Optional.of(objectMapper.treeToValue(copy, TemplateContent.class));
            }
        }
        return Optional.empty();
    }

    private JsonNode snapshot() {
        ConfigVersion latest = releaseService.latest()
                .orElseThrow(() -> ApiException.conflict("no_config", "No configuration has been published yet"));
        return objectMapper.readTree(latest.getPayload());
    }
}
