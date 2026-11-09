package dev.skilltree.practice;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.auth.CurrentUser;

@RestController
@RequestMapping("/api/v1")
public class PracticeController {

    private final PracticeService service;

    public PracticeController(PracticeService service) {
        this.service = service;
    }

    public record SessionRequest(@Min(1) @Max(PracticeService.MAX_SESSION_SECONDS) int durationSeconds) {
    }

    public record SessionResponse(Long id, UUID treeId, String nodeId, int durationSeconds, Instant endedAt) {
        static SessionResponse of(StudySession s) {
            return new SessionResponse(s.getId(), s.getTreeId(), s.getNodeId(), s.getDurationSeconds(), s.getEndedAt());
        }
    }

    @GetMapping("/trees/{treeId}/nodes/{nodeId}/practice")
    public PracticeContent practice(@PathVariable UUID treeId, @PathVariable String nodeId, Authentication auth) {
        return service.practice(CurrentUser.from(auth).id(), treeId, nodeId);
    }

    @PostMapping("/trees/{treeId}/nodes/{nodeId}/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse recordSession(@PathVariable UUID treeId, @PathVariable String nodeId,
            @Valid @RequestBody SessionRequest req, Authentication auth) {
        return SessionResponse.of(service.recordSession(CurrentUser.from(auth).id(), treeId, nodeId, req.durationSeconds()));
    }

    /** Study sessions since the given instant (the client groups them into local days). */
    @GetMapping("/sessions")
    public List<SessionResponse> sessions(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since,
            Authentication auth) {
        return service.sessionsSince(CurrentUser.from(auth).id(), since).stream().map(SessionResponse::of).toList();
    }
}
