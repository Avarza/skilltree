package dev.skilltree.cms;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cms_entries")
public class CmsEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType type;

    @Column(nullable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryStatus status;

    /** Working copy (JSON). */
    @Column(nullable = false)
    private String content;

    @Column(name = "current_revision", nullable = false)
    private int currentRevision;

    @Column(name = "published_revision")
    private Integer publishedRevision;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CmsEntry() {
    }

    public CmsEntry(EntryType type, String slug, String content, Long createdBy) {
        this.type = type;
        this.slug = slug;
        this.status = EntryStatus.DRAFT;
        this.content = content;
        this.currentRevision = 1;
        this.updatedBy = createdBy;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void newRevision(String content, Long editor) {
        this.content = content;
        this.currentRevision++;
        this.status = EntryStatus.DRAFT;
        touch(editor);
    }

    public void touch(Long actor) {
        this.updatedBy = actor;
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public EntryType getType() {
        return type;
    }

    public String getSlug() {
        return slug;
    }

    public EntryStatus getStatus() {
        return status;
    }

    public void setStatus(EntryStatus status) {
        this.status = status;
    }

    public String getContent() {
        return content;
    }

    public int getCurrentRevision() {
        return currentRevision;
    }

    public Integer getPublishedRevision() {
        return publishedRevision;
    }

    public void setPublishedRevision(Integer publishedRevision) {
        this.publishedRevision = publishedRevision;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean isLive() {
        return publishedRevision != null && status != EntryStatus.ARCHIVED;
    }
}
