package dev.skilltree.release;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.common.ApiException;

/**
 * Endpoint for mobile clients. The app downloads the snapshot on start, caches it, and on next start / foreground
 * sends If-None-Match to get a cheap 304 when nothing changed. Content is public (no user data).
 */
@RestController
@RequestMapping("/api/v1/config")
public class PublicConfigController {

    private final ReleaseService releaseService;

    public PublicConfigController(ReleaseService releaseService) {
        this.releaseService = releaseService;
    }

    public record VersionInfo(int version, int schemaVersion, String checksum) {
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> latest(@RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        ConfigVersion latest = releaseService.latest()
                .orElseThrow(() -> ApiException.notFound("Published configuration"));
        ResponseEntity.BodyBuilder ok = ResponseEntity.ok()
                .eTag(latest.etag())
                .cacheControl(CacheControl.noCache());
        if (latest.etag().equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(latest.etag()).build();
        }
        return ok.body(latest.getPayload());
    }

    @GetMapping("/version")
    public VersionInfo version() {
        ConfigVersion latest = releaseService.latest()
                .orElseThrow(() -> ApiException.notFound("Published configuration"));
        return new VersionInfo(latest.getVersion(), latest.getSchemaVersion(), latest.getChecksum());
    }
}
