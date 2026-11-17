package com.schoolos.pedagogy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** One chapter of a class programme, ticked as taught through coverage records. */
@Entity
@Table(name = "curriculum_chapter")
public class CurriculumChapter extends BaseEntity {

    @Column(name = "class_id")
    private UUID classId;

    @Column(name = "subject")
    private String subject;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "programme_ref")
    private String programmeRef;

    @Column(name = "position", nullable = false)
    private int position;

    public UUID getClassId() { return classId; }
    public void setClassId(UUID v) { classId = v; }
    public String getSubject() { return subject; }
    public void setSubject(String v) { subject = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }
    public String getProgrammeRef() { return programmeRef; }
    public void setProgrammeRef(String v) { programmeRef = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { position = v; }
}
