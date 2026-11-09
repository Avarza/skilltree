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
@Table(name = "study_sessions")
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tree_id", nullable = false)
    private UUID treeId;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    protected StudySession() {
    }

    public StudySession(Long userId, UUID treeId, String nodeId, int durationSeconds) {
        this.userId = userId;
        this.treeId = treeId;
        this.nodeId = nodeId;
        this.durationSeconds = durationSeconds;
        this.endedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public UUID getTreeId() {
        return treeId;
    }

    public String getNodeId() {
        return nodeId;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public Instant getEndedAt() {
        return endedAt;
    }
}
