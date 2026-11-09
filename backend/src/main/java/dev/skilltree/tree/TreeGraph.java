package dev.skilltree.tree;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Structural checks shared by CMS templates, user trees and AI output: unique ids, known references, no cycles. */
public final class TreeGraph {

    private TreeGraph() {
    }

    public record Edge(String id, List<String> requires) {
    }

    public static List<String> validate(List<Edge> nodes) {
        List<String> errors = new ArrayList<>();
        Map<String, List<String>> graph = new HashMap<>();
        for (Edge n : nodes) {
            if (graph.putIfAbsent(n.id(), n.requires()) != null) {
                errors.add("Duplicate node id '" + n.id() + "'");
            }
        }
        for (Edge n : nodes) {
            for (String req : n.requires()) {
                if (req.equals(n.id())) {
                    errors.add("Node '" + n.id() + "' cannot require itself");
                } else if (!graph.containsKey(req)) {
                    errors.add("Node '" + n.id() + "' requires unknown node '" + req + "'");
                }
            }
        }
        if (errors.isEmpty() && hasCycle(graph)) {
            errors.add("Node prerequisites contain a cycle");
        }
        return errors;
    }

    private static boolean hasCycle(Map<String, List<String>> graph) {
        Set<String> done = new HashSet<>();
        Set<String> onPath = new HashSet<>();
        for (String id : graph.keySet()) {
            if (visit(id, graph, done, onPath)) {
                return true;
            }
        }
        return false;
    }

    private static boolean visit(String id, Map<String, List<String>> graph, Set<String> done, Set<String> onPath) {
        if (done.contains(id)) {
            return false;
        }
        if (!onPath.add(id)) {
            return true;
        }
        for (String req : graph.getOrDefault(id, List.of())) {
            if (visit(req, graph, done, onPath)) {
                return true;
            }
        }
        onPath.remove(id);
        done.add(id);
        return false;
    }
}
