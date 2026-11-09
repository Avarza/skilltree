package dev.skilltree.cms;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cms_revisions")
public class CmsRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entry_id", nullable = false)
    private Long entryId;

    @Column(nullable = false)
    private int revision;

    @Column(nullable = false)
    private String content;

    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CmsRevision() {
    }

    public CmsRevision(Long entryId, int revision, String content, String note, Long createdBy) {
        this.entryId = entryId;
        this.revision = revision;
        this.content = content;
        this.note = note;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }

    public Long getEntryId() {
        return entryId;
    }

    public int getRevision() {
        return revision;
    }

    public String getContent() {
        return content;
    }

    public String getNote() {
        return note;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
