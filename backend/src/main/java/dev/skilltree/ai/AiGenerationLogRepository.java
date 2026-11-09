package dev.skilltree.ai;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AiGenerationLogRepository extends JpaRepository<AiGenerationLog, Long> {

    long countByUserIdAndStatusAndCreatedAtAfter(Long userId, String status, Instant after);
}
