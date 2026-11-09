package dev.skilltree.tree;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.skilltree.auth.CurrentUser;
import dev.skilltree.tree.TreeNode.NodeStatus;

@RestController
@RequestMapping("/api/v1/trees")
public class TreeController {

    private final TreeService service;

    public TreeController(TreeService service) {
        this.service = service;
    }

    public record NodeInput(@NotNull String id, @NotBlank String title, String description, int xp,
            List<String> requires) {
        TreeNode toNode() {
            return new TreeNode(id, title, description, xp, requires, null);
        }
    }

    public record TreeInput(@NotBlank @Size(max = 120) String title, @Size(max = 1000) String description,
            @NotEmpty @Size(max = TreeService.MAX_NODES) List<@Valid NodeInput> nodes) {
    }

    public record GenerateRequest(@NotBlank @Size(max = 200) String topic,
            @NotNull @Pattern(regexp = "^(beginner|intermediate|advanced)$") String level,
            @Size(max = 300) String goal, @Pattern(regexp = "^[a-z]{2}$") String locale) {
    }

    public record NodeStatusRequest(@NotNull NodeStatus status) {
    }

    public record TreeResponse(UUID id, String title, String description, SkillTree.Source source,
            String templateSlug, List<TreeNode> nodes, int earnedXp, int totalXp, int level, int completedNodes,
            Instant createdAt, Instant updatedAt) {
        static TreeResponse of(TreeService.TreeView v) {
            SkillTree t = v.tree();
            return new TreeResponse(t.getId(), t.getTitle(), t.getDescription(), t.getSource(), t.getTemplateSlug(),
                    v.nodes(), v.earnedXp(), v.totalXp(), v.level(), v.completedNodes(), t.getCreatedAt(),
                    t.getUpdatedAt());
        }
    }

    @GetMapping
    public List<TreeResponse> list(Authentication auth) {
        return service.list(userId(auth)).stream().map(TreeResponse::of).toList();
    }

    @GetMapping("/{id}")
    public TreeResponse get(@PathVariable UUID id, Authentication auth) {
        return TreeResponse.of(service.get(userId(auth), id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TreeResponse create(@Valid @RequestBody TreeInput req, Authentication auth) {
        return TreeResponse.of(service.createManual(userId(auth), req.title(), req.description(),
                req.nodes().stream().map(NodeInput::toNode).toList()));
    }

    @PostMapping("/from-template/{slug}")
    @ResponseStatus(HttpStatus.CREATED)
    public TreeResponse fromTemplate(@PathVariable String slug, Authentication auth) {
        return TreeResponse.of(service.createFromTemplate(userId(auth), slug));
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public TreeResponse generate(@Valid @RequestBody GenerateRequest req, Authentication auth) {
        return TreeResponse.of(service.generate(userId(auth), req.topic(), req.level(), req.goal(), req.locale()));
    }

    @PutMapping("/{id}")
    public TreeResponse update(@PathVariable UUID id, @Valid @RequestBody TreeInput req, Authentication auth) {
        return TreeResponse.of(service.update(userId(auth), id, req.title(), req.description(),
                req.nodes().stream().map(NodeInput::toNode).toList()));
    }

    @PatchMapping("/{id}/nodes/{nodeId}")
    public TreeResponse setNodeStatus(@PathVariable UUID id, @PathVariable String nodeId,
            @Valid @RequestBody NodeStatusRequest req, Authentication auth) {
        return TreeResponse.of(service.setNodeStatus(userId(auth), id, nodeId, req.status()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id, Authentication auth) {
        service.delete(userId(auth), id);
    }

    private static Long userId(Authentication auth) {
        return CurrentUser.from(auth).id();
    }
}
