package dev.skilltree.practice;

/** Produces practice content for a skill. Implemented by {@link ClaudePracticeGenerator}. */
public interface PracticeGenerator {

    Result generate(Request request);

    record Request(String treeTitle, String nodeTitle, String nodeDescription, int xp, String locale) {
    }

    record Result(PracticeContent content, String model) {
    }
}
