package dev.skilltree.practice;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    List<StudySession> findAllByUserIdAndEndedAtAfterOrderByEndedAtAsc(Long userId, Instant after);
}
