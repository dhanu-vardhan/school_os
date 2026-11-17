package com.schoolos.pedagogy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** Ordered link between a lesson plan and a library resource. */
@Entity
@Table(name = "lesson_plan_resource")
public class LessonPlanResource extends BaseEntity {

    @Column(name = "plan_id", nullable = false, updatable = false)
    private UUID planId;

    @Column(name = "resource_id", nullable = false, updatable = false)
    private UUID resourceId;

    @Column(name = "position", nullable = false)
    private int position;

    public UUID getPlanId() { return planId; }
    public void setPlanId(UUID v) { planId = v; }
    public UUID getResourceId() { return resourceId; }
    public void setResourceId(UUID v) { resourceId = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { position = v; }
}
