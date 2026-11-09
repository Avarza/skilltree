package dev.skilltree.practice;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NodePracticeRepository extends JpaRepository<NodePractice, Long> {

    Optional<NodePractice> findByTreeIdAndNodeId(UUID treeId, String nodeId);

    /** Practice generations for trees owned by the user since a point in time (for rate limiting). */
    @Query("select count(p) from NodePractice p, dev.skilltree.tree.SkillTree t "
            + "where p.treeId = t.id and t.ownerId = :userId and p.createdAt > :after and p.model <> 'fallback'")
    long countGeneratedSince(Long userId, Instant after);
}
