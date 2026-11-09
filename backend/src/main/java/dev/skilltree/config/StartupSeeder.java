package dev.skilltree.config;

import java.io.IOException;
import java.io.InputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.skilltree.auth.Role;
import dev.skilltree.auth.UserAccount;
import dev.skilltree.auth.UserRepository;
import dev.skilltree.cms.CmsEntry;
import dev.skilltree.cms.CmsEntryRepository;
import dev.skilltree.cms.CmsService;
import dev.skilltree.cms.EntryType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * On an empty database: publishes default content (theme, app config, one template) so mobile clients always get a
 * valid configuration, and in local profiles creates the dev ADMIN account.
 */
@Component
public class StartupSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupSeeder.class);

    private final CmsEntryRepository entries;
    private final CmsService cms;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final SkillTreeProperties properties;
    private final ObjectMapper objectMapper;

    public StartupSeeder(CmsEntryRepository entries, CmsService cms, UserRepository users,
            PasswordEncoder passwordEncoder, SkillTreeProperties properties, ObjectMapper objectMapper) {
        this.entries = entries;
        this.cms = cms;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        seedDevAdmin();
        if (entries.count() > 0) {
            return;
        }
        log.info("Empty CMS - seeding and publishing default content");
        seed(EntryType.THEME, "default", "seed/theme-default.json", false);
        seed(EntryType.SKILL_TEMPLATE, "learn-typescript", "seed/template-learn-typescript.json", false);
        seed(EntryType.APP_CONFIG, EntryType.APP_CONFIG_SLUG, "seed/app-config.json", true);
    }

    private void seed(EntryType type, String slug, String resource, boolean release) throws IOException {
        JsonNode content;
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            content = objectMapper.readTree(in);
        }
        CmsEntry entry = cms.create(type, slug, content, "Initial content", null);
        cms.submitForReview(entry.getId(), null);
        if (release) {
            cms.publish(entry.getId(), "Initial content release", null);
        } else {
            // Mark as published without creating a release yet; the app config publish creates v1 with everything.
            entry.setStatus(dev.skilltree.cms.EntryStatus.PUBLISHED);
            entry.setPublishedRevision(entry.getCurrentRevision());
        }
    }

    private void seedDevAdmin() {
        SkillTreeProperties.Dev dev = properties.dev();
        if (dev == null || dev.adminEmail() == null || dev.adminPassword() == null
                || users.existsByEmailIgnoreCase(dev.adminEmail())) {
            return;
        }
        users.save(new UserAccount(dev.adminEmail(), passwordEncoder.encode(dev.adminPassword()), "Dev Admin",
                Role.ADMIN));
        log.warn("Created dev ADMIN account {} - local development only", dev.adminEmail());
    }
}
