package dev.skilltree.release;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Size;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.auth.CurrentUser;
import tools.jackson.databind.JsonNode;

/** Content releases for the CMS and the Release Manager: history, preview and rollback. */
@RestController
@RequestMapping("/api/v1/admin/config-versions")
public class ReleaseAdminController {

    private final ReleaseService releaseService;

    public ReleaseAdminController(ReleaseService releaseService) {
        this.releaseService = releaseService;
    }

    public record VersionSummary(int version, String checksum, ConfigVersion.Source source, String note,
            Long createdBy, Instant createdAt) {
        static VersionSummary of(ConfigVersion v) {
            return new VersionSummary(v.getVersion(), v.getChecksum(), v.getSource(), v.getNote(), v.getCreatedBy(),
                    v.getCreatedAt());
        }
    }

    public record RollbackRequest(@Size(max = 500) String note) {
    }

    @GetMapping
    public List<VersionSummary> history() {
        return releaseService.history().stream().map(VersionSummary::of).toList();
    }

    @GetMapping("/preview")
    public JsonNode preview() {
        return releaseService.preview();
    }

    @PostMapping("/{version}/rollback")
    @PreAuthorize("hasRole('PUBLISHER')")
    public VersionSummary rollback(@PathVariable int version, @RequestBody(required = false) RollbackRequest req,
            Authentication auth) {
        return VersionSummary.of(releaseService.rollback(version, req == null ? null : req.note(),
                CurrentUser.from(auth)));
    }
}
