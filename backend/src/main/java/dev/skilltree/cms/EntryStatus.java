package dev.skilltree.cms;

/**
 * DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED. Editing a PUBLISHED entry moves it back to DRAFT while the previously
 * published revision stays live until the new one is approved.
 */
public enum EntryStatus {
    DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED
}
