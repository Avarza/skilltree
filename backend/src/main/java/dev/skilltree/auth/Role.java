package dev.skilltree.auth;

/**
 * Hierarchy: ADMIN > PUBLISHER > EDITOR > USER (see SecurityConfig#roleHierarchy).
 * EDITOR edits CMS drafts, PUBLISHER approves and releases content, ADMIN manages users and audit.
 */
public enum Role {
    USER, EDITOR, PUBLISHER, ADMIN
}
