package dev.skilltree.release;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Immutable published configuration snapshot ("content release"). */
@Entity
@Table(name = "app_config_versions")
public class ConfigVersion {

    public enum Source {
        PUBLISH, ROLLBACK
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private int version;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(nullable = false)
    private String payload;

    @Column(nullable = false)
    private String checksum;

    @Column(nullable = false)
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private Source source;

    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ConfigVersion() {
    }

    public ConfigVersion(int version, int schemaVersion, String payload, String checksum, Source source, String note,
            Long createdBy, Instant createdAt) {
        this.version = version;
        this.schemaVersion = schemaVersion;
        this.payload = payload;
        this.checksum = checksum;
        this.source = source;
        this.note = note;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    public int getVersion() {
        return version;
    }

    public int getSchemaVersion() {
        return schemaVersion;
    }

    public String getPayload() {
        return payload;
    }

    public String getChecksum() {
        return checksum;
    }

    public Source getSource() {
        return source;
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

    public String etag() {
        return "\"v" + version + "-" + checksum.substring(0, 12) + "\"";
    }
}
