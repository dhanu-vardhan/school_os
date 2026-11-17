package com.schoolos.pedagogy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface LessonPlanRepository extends JpaRepository<LessonPlan, UUID> {

    List<LessonPlan> findByClassIdAndPlannedDateBetweenOrderByPlannedDateAscStartMinuteAsc(
            UUID classId, LocalDate from, LocalDate to);

    List<LessonPlan> findByClassIdOrderByPlannedDateAscStartMinuteAsc(UUID classId);
}
