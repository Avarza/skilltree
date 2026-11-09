package dev.skilltree.release;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfigVersionRepository extends JpaRepository<ConfigVersion, Long> {

    Optional<ConfigVersion> findTopByOrderByVersionDesc();

    Optional<ConfigVersion> findByVersion(int version);

    List<ConfigVersion> findTop50ByOrderByVersionDesc();
}
