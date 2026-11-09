package dev.skilltree.cms;

import dev.skilltree.cms.content.ContentModels;

public enum EntryType {
    SKILL_TEMPLATE(ContentModels.TemplateContent.class),
    THEME(ContentModels.ThemeContent.class),
    /** Singleton entry with slug {@link #APP_CONFIG_SLUG}. */
    APP_CONFIG(ContentModels.AppConfigContent.class);

    public static final String APP_CONFIG_SLUG = "app";

    private final Class<?> contentClass;

    EntryType(Class<?> contentClass) {
        this.contentClass = contentClass;
    }

    public Class<?> contentClass() {
        return contentClass;
    }
}
