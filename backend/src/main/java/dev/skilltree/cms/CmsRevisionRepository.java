package dev.skilltree.cms;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CmsRevisionRepository extends JpaRepository<CmsRevision, Long> {

    List<CmsRevision> findAllByEntryIdOrderByRevisionDesc(Long entryId);

    Optional<CmsRevision> findByEntryIdAndRevision(Long entryId, int revision);
}
