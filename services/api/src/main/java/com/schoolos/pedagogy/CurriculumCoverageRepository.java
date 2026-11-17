package com.schoolos.pedagogy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CurriculumCoverageRepository extends JpaRepository<CurriculumCoverage, UUID> {
    List<CurriculumCoverage> findByChapterIdIn(Collection<UUID> chapterIds);
    Optional<CurriculumCoverage> findByChapterIdAndLessonPlanId(UUID chapterId, UUID lessonPlanId);
    List<CurriculumCoverage> findByTaughtOnBetween(LocalDate from, LocalDate to);
}
