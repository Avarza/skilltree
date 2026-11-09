package dev.skilltree.practice;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "node_practice")
public class NodePractice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    /** JSON of {@link PracticeContent}. */
    @Column(nullable = false)
    private String content;

    private String model;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected NodePractice() {
    }

    public NodePractice(UUID treeId, String nodeId, String content, String model) {
        this.treeId = treeId;
        this.nodeId = nodeId;
        this.content = content;
        this.model = model;
        this.createdAt = Instant.now();
    }

    public String getContent() {
        return content;
    }

    public String getModel() {
        return model;
    }
}
