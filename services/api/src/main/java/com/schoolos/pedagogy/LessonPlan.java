package com.schoolos.pedagogy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.UUID;

/** A teacher's plan for one lesson occurrence. Class-linked, never pupil-linked. */
@Entity
@Table(name = "lesson_plan")
public class LessonPlan extends BaseEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "subject")
    private String subject;

    @Column(name = "level")
    private String level;

    @Column(name = "class_id")
    private UUID classId;

    @Column(name = "planned_date")
    private LocalDate plannedDate;

    /** Stable slot key used until a timetable aggregate exists (ISO day-of-week, 1–7). */
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    @Column(name = "start_minute", nullable = false)
    private int startMinute = 480;

    @Column(name = "end_minute", nullable = false)
    private int endMinute = 525;

    @Column(name = "room")
    private String room;

    @Column(name = "objectives")
    private String objectives;

    @Column(name = "steps")
    private String steps;

    @Column(name = "differentiation_notes")
    private String differentiationNotes;

    @Column(name = "status", nullable = false)
    private String status = "draft";

    /** Set when this plan was produced by “copy to next week/year”. */
    @Column(name = "source_plan_id")
    private UUID sourcePlanId;

    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { subject = v; }
    public String getLevel() { return level; }
    public void setLevel(String v) { level = v; }
    public UUID getClassId() { return classId; }
    public void setClassId(UUID v) { classId = v; }
    public LocalDate getPlannedDate() { return plannedDate; }
    public void setPlannedDate(LocalDate v) { plannedDate = v; }
    public Integer getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Integer v) { dayOfWeek = v; }
    public int getStartMinute() { return startMinute; }
    public void setStartMinute(int v) { startMinute = v; }
    public int getEndMinute() { return endMinute; }
    public void setEndMinute(int v) { endMinute = v; }
    public String getRoom() { return room; }
    public void setRoom(String v) { room = v; }
    public String getObjectives() { return objectives; }
    public void setObjectives(String v) { objectives = v; }
    public String getSteps() { return steps; }
    public void setSteps(String v) { steps = v; }
    public String getDifferentiationNotes() { return differentiationNotes; }
    public void setDifferentiationNotes(String v) { differentiationNotes = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
    public UUID getSourcePlanId() { return sourcePlanId; }
    public void setSourcePlanId(UUID v) { sourcePlanId = v; }
}
