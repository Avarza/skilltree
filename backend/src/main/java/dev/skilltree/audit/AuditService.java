package dev.skilltree.audit;

import java.util.Map;

import org.springframework.stereotype.Service;

import dev.skilltree.auth.CurrentUser;
import tools.jackson.databind.ObjectMapper;

/** Records who changed what. Runs inside the caller's transaction so the log and the change commit together. */
@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void record(CurrentUser actor, String action, String targetType, Object targetId, Map<String, ?> details) {
        repository.save(new AuditLog(actor == null ? null : actor.id(), actor == null ? "system" : actor.email(),
                action, targetType, targetId == null ? null : targetId.toString(),
                details == null || details.isEmpty() ? null : objectMapper.writeValueAsString(details)));
    }
}
