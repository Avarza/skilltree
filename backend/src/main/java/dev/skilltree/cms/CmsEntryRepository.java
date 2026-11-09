package dev.skilltree.cms;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CmsEntryRepository extends JpaRepository<CmsEntry, Long> {

    List<CmsEntry> findAllByTypeOrderBySlug(EntryType type);

    List<CmsEntry> findAllByOrderByTypeAscSlugAsc();

    Optional<CmsEntry> findByTypeAndSlug(EntryType type, String slug);

    boolean existsByTypeAndSlug(EntryType type, String slug);
}
