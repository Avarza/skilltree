package dev.skilltree.tree;

import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import dev.skilltree.cms.content.ContentModels;

public record TreeNode(
        @NotNull @Pattern(regexp = ContentModels.NODE_ID) String id,
        @NotBlank @Size(max = 80) String title,
        @Size(max = 500) String description,
        @Min(0) @Max(10_000) int xp,
        @Size(max = 10) List<@NotNull String> requires,
        NodeStatus status) {

    public enum NodeStatus {
        LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED
    }

    public TreeNode {
        requires = requires == null ? List.of() : List.copyOf(requires);
    }

    public TreeNode withStatus(NodeStatus newStatus) {
        return new TreeNode(id, title, description, xp, requires, newStatus);
    }
}
