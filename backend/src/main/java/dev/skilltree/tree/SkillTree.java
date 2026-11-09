package dev.skilltree.tree;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "skill_trees")
public class SkillTree {

    public enum Source {
        MANUAL, TEMPLATE, AI
    }

    @Id
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Source source;

    @Column(name = "template_slug")
    private String templateSlug;

    /** JSON array of {@link TreeNode}. */
    @Column(nullable = false)
    private String nodes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SkillTree() {
    }

    public SkillTree(Long ownerId, String title, String description, Source source, String templateSlug,
            String nodes) {
        this.id = UUID.randomUUID();
        this.ownerId = ownerId;
        this.title = title;
        this.description = description;
        this.source = source;
        this.templateSlug = templateSlug;
        this.nodes = nodes;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public void update(String title, String description, String nodes) {
        this.title = title;
        this.description = description;
        this.nodes = nodes;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Source getSource() {
        return source;
    }

    public String getTemplateSlug() {
        return templateSlug;
    }

    public String getNodes() {
        return nodes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
