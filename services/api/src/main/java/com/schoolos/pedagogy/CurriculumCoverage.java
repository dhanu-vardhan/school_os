package com.schoolos.pedagogy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

/** Records that a curriculum chapter was taught, optionally via a lesson plan. */
@Entity
@Table(name = "curriculum_coverage")
public class CurriculumCoverage extends BaseEntity {

    @Column(name = "chapter_id", nullable = false, updatable = false)
    private UUID chapterId;

    @Column(name = "lesson_plan_id")
    private UUID lessonPlanId;

    @Column(name = "taught_on", nullable = false)
    private LocalDate taughtOn;

    @Column(name = "term")
    private String term;

    public UUID getChapterId() { return chapterId; }
    public void setChapterId(UUID v) { chapterId = v; }
    public UUID getLessonPlanId() { return lessonPlanId; }
    public void setLessonPlanId(UUID v) { lessonPlanId = v; }
    public LocalDate getTaughtOn() { return taughtOn; }
    public void setTaughtOn(LocalDate v) { taughtOn = v; }
    public String getTerm() { return term; }
    public void setTerm(String v) { term = v; }
}
