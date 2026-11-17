package com.schoolos.pedagogy;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonPlanResourceRepository extends JpaRepository<LessonPlanResource, UUID> {
    List<LessonPlanResource> findByPlanIdOrderByPositionAsc(UUID planId);
    void deleteByPlanId(UUID planId);
}
