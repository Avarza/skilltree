package dev.skilltree.tree;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.skilltree.ai.AiGenerationLog;
import dev.skilltree.ai.AiGenerationLogRepository;
import dev.skilltree.ai.TreeGenerator;
import dev.skilltree.cms.content.ContentModels.AppConfigContent;
import dev.skilltree.cms.content.ContentModels.TemplateContent;
import dev.skilltree.common.ApiException;
import dev.skilltree.release.PublishedContent;
import dev.skilltree.tree.TreeNode.NodeStatus;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
public class TreeService {

    public static final int MAX_NODES = 100;
    public static final int MAX_TREES_PER_USER = 200;

    private final SkillTreeRepository trees;
    private final AiGenerationLogRepository aiLogs;
    private final TreeGenerator generator;
    private final PublishedContent published;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public TreeService(SkillTreeRepository trees, AiGenerationLogRepository aiLogs, TreeGenerator generator,
            PublishedContent published, ObjectMapper objectMapper, Validator validator) {
        this.trees = trees;
        this.aiLogs = aiLogs;
        this.generator = generator;
        this.published = published;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    public record TreeView(SkillTree tree, List<TreeNode> nodes, int earnedXp, int totalXp, int level,
            int completedNodes) {
    }

    @Transactional(readOnly = true)
    public List<TreeView> list(Long ownerId) {
        AppConfigContent config = published.appConfig();
        return trees.findAllByOwnerIdOrderByUpdatedAtDesc(ownerId).stream().map(t -> view(t, config)).toList();
    }

    @Transactional(readOnly = true)
    public TreeView get(Long ownerId, UUID id) {
        return view(load(ownerId, id), published.appConfig());
    }

    @Transactional
    public TreeView createManual(Long ownerId, String title, String description, List<TreeNode> nodes) {
        return save(ownerId, title, description, SkillTree.Source.MANUAL, null, nodes);
    }

    @Transactional
    public TreeView createFromTemplate(Long ownerId, String slug) {
        TemplateContent template = published.template(slug)
                .orElseThrow(() -> ApiException.notFound("Template '" + slug + "'"));
        List<TreeNode> nodes = template.nodes().stream()
                .map(n -> new TreeNode(n.id(), n.title(), n.description(), n.xp(), n.requiresOrEmpty(), null))
                .toList();
        return save(ownerId, template.title(), template.description(), SkillTree.Source.TEMPLATE, slug, nodes);
    }

    /** Not transactional on purpose: no DB transaction is held open during the (slow) AI call. */
    public TreeView generate(Long ownerId, String topic, String level, String goal, String locale) {
        AppConfigContent config = published.appConfig();
        if (!config.aiGeneration().enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "ai_disabled", "AI generation is currently disabled");
        }
        long usedToday = aiLogs.countByUserIdAndStatusAndCreatedAtAfter(ownerId, AiGenerationLog.SUCCESS,
                LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC));
        if (usedToday >= config.aiGeneration().dailyLimitPerUser()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "ai_daily_limit",
                    "Daily AI generation limit reached");
        }
        TreeGenerator.Result result;
        try {
            result = generator.generate(new TreeGenerator.Request(topic, level, goal,
                    locale == null ? config.defaultLocale() : locale, config.aiGeneration().maxNodes()));
        } catch (RuntimeException e) {
            aiLogs.save(new AiGenerationLog(ownerId, topic, AiGenerationLog.FAILED, null, null, null));
            throw e;
        }
        List<TreeNode> nodes = result.nodes().stream()
                .map(n -> new TreeNode(n.id(), n.title(), n.description(), n.xp(), n.requires(), null))
                .toList();
        if (nodes.size() > config.aiGeneration().maxNodes()) {
            nodes = nodes.subList(0, config.aiGeneration().maxNodes());
            Set<String> kept = nodes.stream().map(TreeNode::id).collect(java.util.stream.Collectors.toSet());
            nodes = nodes.stream()
                    .map(n -> new TreeNode(n.id(), n.title(), n.description(), n.xp(),
                            n.requires().stream().filter(kept::contains).toList(), null))
                    .toList();
        }
        TreeView view;
        try {
            view = save(ownerId, truncate(result.title(), 120), truncate(result.description(), 1000),
                    SkillTree.Source.AI, null, nodes);
        } catch (ApiException e) {
            aiLogs.save(new AiGenerationLog(ownerId, topic, AiGenerationLog.FAILED, result.model(),
                    result.inputTokens(), result.outputTokens()));
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ai_invalid_tree", "AI produced an invalid tree, try again",
                    e.errors());
        }
        aiLogs.save(new AiGenerationLog(ownerId, topic, AiGenerationLog.SUCCESS, result.model(), result.inputTokens(),
                result.outputTokens()));
        return view;
    }

    @Transactional
    public TreeView update(Long ownerId, UUID id, String title, String description, List<TreeNode> nodes) {
        SkillTree tree = load(ownerId, id);
        Map<String, NodeStatus> previous = new HashMap<>();
        readNodes(tree).forEach(n -> previous.put(n.id(), n.status()));
        List<TreeNode> merged = nodes.stream()
                .map(n -> n.withStatus(previous.getOrDefault(n.id(), NodeStatus.AVAILABLE)))
                .toList();
        tree.update(title, description, serialize(normalize(validate(merged))));
        return view(tree, published.appConfig());
    }

    @Transactional
    public TreeView setNodeStatus(Long ownerId, UUID id, String nodeId, NodeStatus status) {
        if (status == NodeStatus.LOCKED) {
            throw ApiException.invalid("Status LOCKED is derived from prerequisites", List.of());
        }
        SkillTree tree = load(ownerId, id);
        Map<String, TreeNode> byId = new LinkedHashMap<>();
        readNodes(tree).forEach(n -> byId.put(n.id(), n));
        TreeNode node = byId.get(nodeId);
        if (node == null) {
            throw ApiException.notFound("Node '" + nodeId + "'");
        }
        if (node.status() == NodeStatus.LOCKED) {
            throw ApiException.conflict("node_locked", "Complete the prerequisites first");
        }
        if (status != NodeStatus.COMPLETED && node.status() == NodeStatus.COMPLETED) {
            boolean dependentStarted = byId.values().stream()
                    .anyMatch(n -> n.requires().contains(nodeId)
                            && (n.status() == NodeStatus.IN_PROGRESS || n.status() == NodeStatus.COMPLETED));
            if (dependentStarted) {
                throw ApiException.conflict("has_dependents", "Skills that build on this one are already started");
            }
        }
        byId.put(nodeId, node.withStatus(status));
        List<TreeNode> updated = normalize(new ArrayList<>(byId.values()));
        tree.update(tree.getTitle(), tree.getDescription(), serialize(updated));
        return view(tree, published.appConfig());
    }

    @Transactional
    public void delete(Long ownerId, UUID id) {
        trees.delete(load(ownerId, id));
    }

    // -----------------------------------------------------------------------------------------------------------

    private TreeView save(Long ownerId, String title, String description, SkillTree.Source source, String templateSlug,
            List<TreeNode> nodes) {
        if (trees.countByOwnerId(ownerId) >= MAX_TREES_PER_USER) {
            throw ApiException.conflict("tree_limit", "You have reached the maximum number of skill trees");
        }
        List<TreeNode> fresh = nodes.stream().map(n -> n.withStatus(null)).toList();
        List<TreeNode> normalized = normalize(validate(fresh));
        SkillTree tree = trees.save(new SkillTree(ownerId, title, description, source, templateSlug,
                serialize(normalized)));
        return view(tree, published.appConfig());
    }

    private List<TreeNode> validate(List<TreeNode> nodes) {
        List<String> errors = new ArrayList<>();
        if (nodes.isEmpty() || nodes.size() > MAX_NODES) {
            errors.add("nodes: must contain 1-" + MAX_NODES + " items");
        }
        for (int i = 0; i < nodes.size(); i++) {
            for (ConstraintViolation<TreeNode> v : validator.validate(nodes.get(i))) {
                errors.add("nodes[" + i + "]." + v.getPropertyPath() + ": " + v.getMessage());
            }
        }
        if (errors.isEmpty()) {
            errors.addAll(TreeGraph.validate(nodes.stream().map(n -> new TreeGraph.Edge(n.id(), n.requires())).toList()));
        }
        if (!errors.isEmpty()) {
            throw ApiException.invalid("Skill tree is not valid", errors);
        }
        return nodes;
    }

    /** Recomputes LOCKED/AVAILABLE from prerequisites; keeps IN_PROGRESS/COMPLETED where still unlocked. */
    private static List<TreeNode> normalize(List<TreeNode> nodes) {
        Map<String, NodeStatus> status = new HashMap<>();
        nodes.forEach(n -> status.put(n.id(), n.status()));
        return nodes.stream().map(n -> {
            boolean unlocked = n.requires().stream().allMatch(r -> status.get(r) == NodeStatus.COMPLETED);
            if (!unlocked) {
                return n.withStatus(NodeStatus.LOCKED);
            }
            if (n.status() == null || n.status() == NodeStatus.LOCKED) {
                return n.withStatus(NodeStatus.AVAILABLE);
            }
            return n;
        }).toList();
    }

    private TreeView view(SkillTree tree, AppConfigContent config) {
        List<TreeNode> nodes = readNodes(tree);
        int total = nodes.stream().mapToInt(TreeNode::xp).sum();
        int earned = nodes.stream().filter(n -> n.status() == NodeStatus.COMPLETED).mapToInt(TreeNode::xp).sum();
        int completed = (int) nodes.stream().filter(n -> n.status() == NodeStatus.COMPLETED).count();
        int level = earned / config.progression().xpPerLevel() + 1;
        return new TreeView(tree, nodes, earned, total, level, completed);
    }

    private SkillTree load(Long ownerId, UUID id) {
        return trees.findByIdAndOwnerId(id, ownerId).orElseThrow(() -> ApiException.notFound("Skill tree"));
    }

    private List<TreeNode> readNodes(SkillTree tree) {
        return objectMapper.readValue(tree.getNodes(), new TypeReference<List<TreeNode>>() {
        });
    }

    private String serialize(List<TreeNode> nodes) {
        return objectMapper.writeValueAsString(nodes);
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }
}
