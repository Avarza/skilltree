package dev.skilltree.cms;

import java.time.Instant;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.auth.CurrentUser;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/admin/entries")
public class CmsAdminController {

    private final CmsService cms;
    private final ObjectMapper objectMapper;

    public CmsAdminController(CmsService cms, ObjectMapper objectMapper) {
        this.cms = cms;
        this.objectMapper = objectMapper;
    }

    public record CreateRequest(@NotNull EntryType type,
            @NotNull @Pattern(regexp = "^[a-z0-9][a-z0-9-]{1,79}$") String slug,
            @NotNull JsonNode content, @Size(max = 500) String note) {
    }

    public record UpdateRequest(@NotNull JsonNode content, @Size(max = 500) String note) {
    }

    public record NoteRequest(@Size(max = 500) String note) {
    }

    public record EntryResponse(Long id, EntryType type, String slug, EntryStatus status, JsonNode content,
            int currentRevision, Integer publishedRevision, Long updatedBy, Instant updatedAt) {
    }

    public record RevisionResponse(int revision, JsonNode content, String note, Long createdBy, Instant createdAt) {
    }

    public record PublishResponse(EntryResponse entry, Integer configVersion) {
    }

    @GetMapping
    public List<EntryResponse> list(@RequestParam(required = false) EntryType type) {
        return cms.list(type).stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public EntryResponse get(@PathVariable Long id) {
        return toResponse(cms.get(id));
    }

    @GetMapping("/{id}/revisions")
    public List<RevisionResponse> revisions(@PathVariable Long id) {
        return cms.revisions(id).stream()
                .map(r -> new RevisionResponse(r.getRevision(), objectMapper.readTree(r.getContent()), r.getNote(),
                        r.getCreatedBy(), r.getCreatedAt()))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResponse create(@Valid @RequestBody CreateRequest req, Authentication auth) {
        return toResponse(cms.create(req.type(), req.slug(), req.content(), req.note(), CurrentUser.from(auth)));
    }

    @PutMapping("/{id}")
    public EntryResponse update(@PathVariable Long id, @Valid @RequestBody UpdateRequest req, Authentication auth) {
        return toResponse(cms.update(id, req.content(), req.note(), CurrentUser.from(auth)));
    }

    @PostMapping("/{id}/submit")
    public EntryResponse submit(@PathVariable Long id, Authentication auth) {
        return toResponse(cms.submitForReview(id, CurrentUser.from(auth)));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('PUBLISHER')")
    public PublishResponse publish(@PathVariable Long id, @Valid @RequestBody(required = false) NoteRequest req,
            Authentication auth) {
        return toPublishResponse(cms.publish(id, req == null ? null : req.note(), CurrentUser.from(auth)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('PUBLISHER')")
    public EntryResponse reject(@PathVariable Long id, @Valid @RequestBody(required = false) NoteRequest req,
            Authentication auth) {
        return toResponse(cms.reject(id, req == null ? null : req.note(), CurrentUser.from(auth)));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('PUBLISHER')")
    public PublishResponse archive(@PathVariable Long id, Authentication auth) {
        return toPublishResponse(cms.archive(id, CurrentUser.from(auth)));
    }

    @PostMapping("/{id}/revisions/{revision}/restore")
    public EntryResponse restore(@PathVariable Long id, @PathVariable int revision, Authentication auth) {
        return toResponse(cms.restoreRevision(id, revision, CurrentUser.from(auth)));
    }

    private PublishResponse toPublishResponse(CmsService.PublishResult result) {
        return new PublishResponse(toResponse(result.entry()),
                result.configVersion() == null ? null : result.configVersion().getVersion());
    }

    private EntryResponse toResponse(CmsEntry e) {
        return new EntryResponse(e.getId(), e.getType(), e.getSlug(), e.getStatus(),
                objectMapper.readTree(e.getContent()), e.getCurrentRevision(), e.getPublishedRevision(),
                e.getUpdatedBy(), e.getUpdatedAt());
    }
}
