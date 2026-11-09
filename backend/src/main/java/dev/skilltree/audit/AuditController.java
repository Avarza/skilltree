package dev.skilltree.audit;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    public record AuditLogResponse(Long id, String actorEmail, String action, String targetType, String targetId,
            String details, Instant createdAt) {
    }

    @GetMapping
    public Page<AuditLogResponse> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return repository.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page, Math.min(size, 200)))
                .map(a -> new AuditLogResponse(a.getId(), a.getActorEmail(), a.getAction(), a.getTargetType(),
                        a.getTargetId(), a.getDetails(), a.getCreatedAt()));
    }
}
