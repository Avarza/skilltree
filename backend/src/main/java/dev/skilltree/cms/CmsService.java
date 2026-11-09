package dev.skilltree.cms;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.skilltree.audit.AuditService;
import dev.skilltree.auth.CurrentUser;
import dev.skilltree.cms.content.ContentModels.AppConfigContent;
import dev.skilltree.common.ApiException;
import dev.skilltree.config.SkillTreeProperties;
import dev.skilltree.release.ConfigVersion;
import dev.skilltree.release.ReleaseService;
import tools.jackson.databind.JsonNode;

@Service
public class CmsService {

    private final CmsEntryRepository entries;
    private final CmsRevisionRepository revisions;
    private final ContentValidator validator;
    private final ReleaseService releaseService;
    private final AuditService audit;
    private final SkillTreeProperties properties;

    public CmsService(CmsEntryRepository entries, CmsRevisionRepository revisions, ContentValidator validator,
            ReleaseService releaseService, AuditService audit, SkillTreeProperties properties) {
        this.entries = entries;
        this.revisions = revisions;
        this.validator = validator;
        this.releaseService = releaseService;
        this.audit = audit;
        this.properties = properties;
    }

    public record PublishResult(CmsEntry entry, ConfigVersion configVersion) {
    }

    @Transactional(readOnly = true)
    public List<CmsEntry> list(EntryType type) {
        return type == null ? entries.findAllByOrderByTypeAscSlugAsc() : entries.findAllByTypeOrderBySlug(type);
    }

    @Transactional(readOnly = true)
    public CmsEntry get(Long id) {
        return entries.findById(id).orElseThrow(() -> ApiException.notFound("CMS entry " + id));
    }

    @Transactional(readOnly = true)
    public List<CmsRevision> revisions(Long id) {
        get(id);
        return revisions.findAllByEntryIdOrderByRevisionDesc(id);
    }

    @Transactional
    public CmsEntry create(EntryType type, String slug, JsonNode content, String note, CurrentUser actor) {
        if (type == EntryType.APP_CONFIG && !EntryType.APP_CONFIG_SLUG.equals(slug)) {
            throw ApiException.invalid("App configuration is a singleton", List.of("slug: must be 'app'"));
        }
        if (entries.existsByTypeAndSlug(type, slug)) {
            throw ApiException.conflict("slug_taken", type + " with slug '" + slug + "' already exists");
        }
        String json = validator.validate(type, content);
        CmsEntry entry = entries.save(new CmsEntry(type, slug, json, actorId(actor)));
        revisions.save(new CmsRevision(entry.getId(), 1, json, note, actorId(actor)));
        audit.record(actor, "CMS_CREATE", type.name(), entry.getId(), Map.of("slug", slug));
        return entry;
    }

    @Transactional
    public CmsEntry update(Long id, JsonNode content, String note, CurrentUser actor) {
        CmsEntry entry = get(id);
        requireNotArchived(entry);
        String json = validator.validate(entry.getType(), content);
        entry.newRevision(json, actorId(actor));
        revisions.save(new CmsRevision(entry.getId(), entry.getCurrentRevision(), json, note, actorId(actor)));
        audit.record(actor, "CMS_UPDATE", entry.getType().name(), entry.getId(),
                Map.of("revision", entry.getCurrentRevision()));
        return entry;
    }

    @Transactional
    public CmsEntry submitForReview(Long id, CurrentUser actor) {
        CmsEntry entry = get(id);
        if (entry.getStatus() != EntryStatus.DRAFT) {
            throw ApiException.conflict("invalid_state", "Only drafts can be submitted for review");
        }
        entry.setStatus(EntryStatus.IN_REVIEW);
        entry.touch(actorId(actor));
        audit.record(actor, "CMS_SUBMIT", entry.getType().name(), entry.getId(),
                Map.of("revision", entry.getCurrentRevision()));
        return entry;
    }

    /** Approves the current revision and immediately creates a new content release (config version). */
    @Transactional
    public PublishResult publish(Long id, String note, CurrentUser actor) {
        CmsEntry entry = get(id);
        if (entry.getStatus() != EntryStatus.IN_REVIEW) {
            throw ApiException.conflict("invalid_state", "Only entries in review can be published");
        }
        // actor == null means the system seeder.
        if (actor != null && properties.cms().requireFourEyes() && !actor.isAdmin()
                && Objects.equals(lastEditor(entry), actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "four_eyes",
                    "Changes must be published by someone other than their author");
        }
        entry.setStatus(EntryStatus.PUBLISHED);
        entry.setPublishedRevision(entry.getCurrentRevision());
        entry.touch(actorId(actor));
        audit.record(actor, "CMS_PUBLISH", entry.getType().name(), entry.getId(),
                Map.of("revision", entry.getCurrentRevision()));
        ConfigVersion version = releaseService.publishSnapshot(actor,
                note != null ? note : "Publish " + entry.getType() + " '" + entry.getSlug() + "' r"
                        + entry.getCurrentRevision());
        return new PublishResult(entry, version);
    }

    /** Sends an in-review entry back to draft. */
    @Transactional
    public CmsEntry reject(Long id, String reason, CurrentUser actor) {
        CmsEntry entry = get(id);
        if (entry.getStatus() != EntryStatus.IN_REVIEW) {
            throw ApiException.conflict("invalid_state", "Only entries in review can be rejected");
        }
        entry.setStatus(EntryStatus.DRAFT);
        entry.touch(actorId(actor));
        Map<String, Object> details = new HashMap<>();
        details.put("revision", entry.getCurrentRevision());
        if (reason != null) {
            details.put("reason", reason);
        }
        audit.record(actor, "CMS_REJECT", entry.getType().name(), entry.getId(), details);
        return entry;
    }

    @Transactional
    public PublishResult archive(Long id, CurrentUser actor) {
        CmsEntry entry = get(id);
        requireNotArchived(entry);
        if (entry.getType() == EntryType.APP_CONFIG) {
            throw ApiException.conflict("protected_entry", "App configuration cannot be archived");
        }
        if (entry.getType() == EntryType.THEME && isActiveTheme(entry.getSlug())) {
            throw ApiException.conflict("protected_entry", "The active theme cannot be archived");
        }
        boolean wasLive = entry.isLive();
        entry.setStatus(EntryStatus.ARCHIVED);
        entry.touch(actorId(actor));
        audit.record(actor, "CMS_ARCHIVE", entry.getType().name(), entry.getId(), Map.of("slug", entry.getSlug()));
        ConfigVersion version = wasLive
                ? releaseService.publishSnapshot(actor, "Archive " + entry.getType() + " '" + entry.getSlug() + "'")
                : null;
        return new PublishResult(entry, version);
    }

    /** Copies an old revision into a new draft revision (it still has to go through review to go live). */
    @Transactional
    public CmsEntry restoreRevision(Long id, int revision, CurrentUser actor) {
        CmsEntry entry = get(id);
        requireNotArchived(entry);
        CmsRevision old = revisions.findByEntryIdAndRevision(id, revision)
                .orElseThrow(() -> ApiException.notFound("Revision " + revision));
        entry.newRevision(old.getContent(), actorId(actor));
        revisions.save(new CmsRevision(id, entry.getCurrentRevision(), old.getContent(),
                "Restored from revision " + revision, actorId(actor)));
        audit.record(actor, "CMS_RESTORE", entry.getType().name(), id,
                Map.of("from", revision, "revision", entry.getCurrentRevision()));
        return entry;
    }

    private Long lastEditor(CmsEntry entry) {
        return revisions.findByEntryIdAndRevision(entry.getId(), entry.getCurrentRevision())
                .map(CmsRevision::getCreatedBy).orElse(null);
    }

    private boolean isActiveTheme(String slug) {
        return entries.findByTypeAndSlug(EntryType.APP_CONFIG, EntryType.APP_CONFIG_SLUG)
                .map(e -> validator.read(e.getContent(), AppConfigContent.class).activeTheme().equals(slug))
                .orElse(false);
    }

    private static void requireNotArchived(CmsEntry entry) {
        if (entry.getStatus() == EntryStatus.ARCHIVED) {
            throw ApiException.conflict("invalid_state", "Archived entries cannot be changed");
        }
    }

    private static Long actorId(CurrentUser actor) {
        return actor == null ? null : actor.id();
    }
}
