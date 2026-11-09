package dev.skilltree.release;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.skilltree.audit.AuditService;
import dev.skilltree.auth.CurrentUser;
import dev.skilltree.cms.CmsEntry;
import dev.skilltree.cms.CmsEntryRepository;
import dev.skilltree.cms.CmsRevisionRepository;
import dev.skilltree.cms.EntryType;
import dev.skilltree.cms.content.ContentModels.AppConfigContent;
import dev.skilltree.common.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Builds the configuration snapshot that mobile clients download and stores it as an immutable, numbered version.
 *
 * <pre>
 * { schemaVersion, version, publishedAt, checksum,
 *   config: {...AppConfigContent}, theme: {slug, ...ThemeContent}, templates: [{slug, ...TemplateContent}] }
 * </pre>
 */
@Service
public class ReleaseService {

    public static final int SCHEMA_VERSION = 1;

    private final CmsEntryRepository entries;
    private final CmsRevisionRepository revisions;
    private final ConfigVersionRepository versions;
    private final ObjectMapper objectMapper;
    private final AuditService audit;

    public ReleaseService(CmsEntryRepository entries, CmsRevisionRepository revisions, ConfigVersionRepository versions,
            ObjectMapper objectMapper, AuditService audit) {
        this.entries = entries;
        this.revisions = revisions;
        this.versions = versions;
        this.objectMapper = objectMapper;
        this.audit = audit;
    }

    /**
     * Creates a new version from all live (published, not archived) entries. Returns the existing latest version when
     * nothing changed. Must run inside the caller's transaction so an invalid snapshot rolls back the publish.
     */
    @Transactional
    public ConfigVersion publishSnapshot(CurrentUser actor, String note) {
        ObjectNode body = buildBody(this::publishedContent);
        String checksum = sha256(objectMapper.writeValueAsString(body));
        Optional<ConfigVersion> latest = versions.findTopByOrderByVersionDesc();
        if (latest.isPresent() && latest.get().getChecksum().equals(checksum)) {
            return latest.get();
        }
        return store(body, checksum, ConfigVersion.Source.PUBLISH, note, actor);
    }

    /** Preview of what clients would get if every current working copy were published. Not persisted. */
    @Transactional(readOnly = true)
    public JsonNode preview() {
        ObjectNode body = buildBody(e -> e.getStatus() == dev.skilltree.cms.EntryStatus.ARCHIVED
                ? null : e.getContent());
        ObjectNode preview = objectMapper.createObjectNode();
        preview.put("schemaVersion", SCHEMA_VERSION);
        preview.put("version", 0);
        preview.put("preview", true);
        preview.setAll(body);
        return preview;
    }

    /** Re-publishes an older snapshot as a new version (clients only ever move forward in version numbers). */
    @Transactional
    public ConfigVersion rollback(int version, String note, CurrentUser actor) {
        ConfigVersion target = versions.findByVersion(version)
                .orElseThrow(() -> ApiException.notFound("Config version " + version));
        ObjectNode body = (ObjectNode) objectMapper.readTree(target.getPayload());
        for (String meta : List.of("schemaVersion", "version", "publishedAt", "checksum")) {
            body.remove(meta);
        }
        ConfigVersion created = store(body, target.getChecksum(), ConfigVersion.Source.ROLLBACK,
                note == null ? "Rollback to v" + version : note, actor);
        audit.record(actor, "CONFIG_ROLLBACK", "CONFIG_VERSION", created.getVersion(), Map.of("restoredFrom", version));
        return created;
    }

    @Transactional(readOnly = true)
    public Optional<ConfigVersion> latest() {
        return versions.findTopByOrderByVersionDesc();
    }

    @Transactional(readOnly = true)
    public List<ConfigVersion> history() {
        return versions.findTop50ByOrderByVersionDesc();
    }

    // -----------------------------------------------------------------------------------------------------------

    private ConfigVersion store(ObjectNode body, String checksum, ConfigVersion.Source source, String note,
            CurrentUser actor) {
        int next = versions.findTopByOrderByVersionDesc().map(v -> v.getVersion() + 1).orElse(1);
        Instant now = Instant.now();
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("schemaVersion", SCHEMA_VERSION);
        payload.put("version", next);
        payload.put("publishedAt", now.toString());
        payload.put("checksum", checksum);
        payload.setAll(body);
        ConfigVersion saved = versions.save(new ConfigVersion(next, SCHEMA_VERSION, objectMapper.writeValueAsString(payload),
                checksum, source, note, actor == null ? null : actor.id(), now));
        if (source == ConfigVersion.Source.PUBLISH) {
            audit.record(actor, "CONFIG_PUBLISH", "CONFIG_VERSION", next, note == null ? Map.of() : Map.of("note", note));
        }
        return saved;
    }

    /** @param contentOf JSON content of an entry for this snapshot, or null when the entry is not included */
    private ObjectNode buildBody(Function<CmsEntry, String> contentOf) {
        List<CmsEntry> all = entries.findAllByOrderByTypeAscSlugAsc();

        CmsEntry appEntry = all.stream()
                .filter(e -> e.getType() == EntryType.APP_CONFIG && EntryType.APP_CONFIG_SLUG.equals(e.getSlug()))
                .filter(e -> contentOf.apply(e) != null)
                .findFirst()
                .orElseThrow(() -> ApiException.conflict("missing_app_config",
                        "App configuration must be published before content can be released"));
        String appJson = contentOf.apply(appEntry);
        AppConfigContent app = objectMapper.readValue(appJson, AppConfigContent.class);

        CmsEntry themeEntry = all.stream()
                .filter(e -> e.getType() == EntryType.THEME && e.getSlug().equals(app.activeTheme()))
                .filter(e -> contentOf.apply(e) != null)
                .findFirst()
                .orElseThrow(() -> ApiException.conflict("missing_theme",
                        "Active theme '" + app.activeTheme() + "' is not published"));

        ObjectNode body = objectMapper.createObjectNode();
        body.set("config", objectMapper.readTree(appJson));
        body.set("theme", withSlug(themeEntry.getSlug(), contentOf.apply(themeEntry)));
        ArrayNode templates = body.putArray("templates");
        all.stream()
                .filter(e -> e.getType() == EntryType.SKILL_TEMPLATE)
                .forEach(e -> {
                    String json = contentOf.apply(e);
                    if (json != null) {
                        templates.add(withSlug(e.getSlug(), json));
                    }
                });
        return body;
    }

    private String publishedContent(CmsEntry entry) {
        if (!entry.isLive()) {
            return null;
        }
        return revisions.findByEntryIdAndRevision(entry.getId(), entry.getPublishedRevision())
                .orElseThrow(() -> new IllegalStateException("Missing published revision for entry " + entry.getId()))
                .getContent();
    }

    private ObjectNode withSlug(String slug, String json) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("slug", slug);
        node.setAll((ObjectNode) objectMapper.readTree(json));
        return node;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
