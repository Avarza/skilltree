package dev.skilltree.tree;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillTreeRepository extends JpaRepository<SkillTree, UUID> {

    List<SkillTree> findAllByOwnerIdOrderByUpdatedAtDesc(Long ownerId);

    Optional<SkillTree> findByIdAndOwnerId(UUID id, Long ownerId);

    long countByOwnerId(Long ownerId);
}
