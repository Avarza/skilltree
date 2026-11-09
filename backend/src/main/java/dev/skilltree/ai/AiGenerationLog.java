package dev.skilltree.ai;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ai_generation_logs")
public class AiGenerationLog {

    public static final String SUCCESS = "SUCCESS";
    public static final String FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false)
    private String status;

    private String model;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AiGenerationLog() {
    }

    public AiGenerationLog(Long userId, String topic, String status, String model, Long inputTokens,
            Long outputTokens) {
        this.userId = userId;
        this.topic = topic;
        this.status = status;
        this.model = model;
        this.inputTokens = inputTokens == null ? null : inputTokens.intValue();
        this.outputTokens = outputTokens == null ? null : outputTokens.intValue();
        this.createdAt = Instant.now();
    }
}
