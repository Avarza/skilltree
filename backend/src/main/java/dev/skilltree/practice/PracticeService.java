package dev.skilltree.practice;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import dev.skilltree.common.ApiException;
import dev.skilltree.release.PublishedContent;
import dev.skilltree.tree.TreeNode;
import dev.skilltree.tree.TreeService;
import tools.jackson.databind.ObjectMapper;

@Service
public class PracticeService {

    /** AI practice generations per user and day (cached results don't count). */
    public static final int DAILY_PRACTICE_LIMIT = 30;
    public static final int MAX_SESSION_SECONDS = 4 * 3600;

    private final TreeService trees;
    private final NodePracticeRepository practices;
    private final StudySessionRepository sessions;
    private final PracticeGenerator generator;
    private final PublishedContent published;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public PracticeService(TreeService trees, NodePracticeRepository practices, StudySessionRepository sessions,
            PracticeGenerator generator, PublishedContent published, ObjectMapper objectMapper, Validator validator) {
        this.trees = trees;
        this.practices = practices;
        this.sessions = sessions;
        this.generator = generator;
        this.published = published;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    /**
     * Returns the practice for a node, generating it on first request. Not transactional on purpose: the slow AI
     * call must not hold a DB transaction. Concurrent first requests may both generate; the unique constraint keeps
     * one row and the loser re-reads it.
     */
    public PracticeContent practice(Long ownerId, UUID treeId, String nodeId) {
        TreeService.TreeView view = trees.get(ownerId, treeId);
        TreeNode node = findNode(view, nodeId);
        var cached = practices.findByTreeIdAndNodeId(treeId, nodeId);
        if (cached.isPresent()) {
            return objectMapper.readValue(cached.get().getContent(), PracticeContent.class);
        }
        if (practices.countGeneratedSince(ownerId, Instant.now().minus(Duration.ofDays(1))) >= DAILY_PRACTICE_LIMIT) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "practice_daily_limit",
                    "Daily limit for new practice sessions reached");
        }
        PracticeGenerator.Result result = generator.generate(new PracticeGenerator.Request(view.tree().getTitle(),
                node.title(), node.description(), node.xp(), published.appConfig().defaultLocale()));
        validate(result.content());
        if ("fallback".equals(result.model())) {
            // Don't cache offline content: once AI is configured the node should get a real lesson and quiz.
            return result.content();
        }
        try {
            practices.save(new NodePractice(treeId, nodeId, objectMapper.writeValueAsString(result.content()),
                    result.model()));
        } catch (DataIntegrityViolationException raced) {
            return practices.findByTreeIdAndNodeId(treeId, nodeId)
                    .map(p -> objectMapper.readValue(p.getContent(), PracticeContent.class))
                    .orElse(result.content());
        }
        return result.content();
    }

    public StudySession recordSession(Long ownerId, UUID treeId, String nodeId, int durationSeconds) {
        findNode(trees.get(ownerId, treeId), nodeId);
        if (durationSeconds < 1 || durationSeconds > MAX_SESSION_SECONDS) {
            throw ApiException.invalid("Session length out of range", List.of("durationSeconds: 1-" + MAX_SESSION_SECONDS));
        }
        return sessions.save(new StudySession(ownerId, treeId, nodeId, durationSeconds));
    }

    public List<StudySession> sessionsSince(Long ownerId, Instant since) {
        Instant floor = Instant.now().minus(Duration.ofDays(62));
        return sessions.findAllByUserIdAndEndedAtAfterOrderByEndedAtAsc(ownerId, since.isBefore(floor) ? floor : since);
    }

    private static TreeNode findNode(TreeService.TreeView view, String nodeId) {
        return view.nodes().stream().filter(n -> n.id().equals(nodeId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Node '" + nodeId + "'"));
    }

    private void validate(PracticeContent content) {
        List<String> errors = new ArrayList<>();
        for (ConstraintViolation<PracticeContent> v : validator.validate(content)) {
            errors.add(v.getPropertyPath() + ": " + v.getMessage());
        }
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "ai_invalid_practice", "AI produced invalid practice", errors);
        }
    }
}
