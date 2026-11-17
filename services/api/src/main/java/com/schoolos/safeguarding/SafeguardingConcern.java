package com.schoolos.safeguarding;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "safeguarding_concern")
public class SafeguardingConcern extends BaseEntity {
    @Column(name = "reported_by", nullable = false) private String reportedBy;
    @Column(name = "subject_student_id") private java.util.UUID subjectStudentId;
    @Column(name = "category", nullable = false) private String category;
    @Column(name = "description", nullable = false) private String description;
    @Column(name = "status", nullable = false) private String status = "open";
    public String getReportedBy() { return reportedBy; }
    public void setReportedBy(String v) { reportedBy = v; }
    public java.util.UUID getSubjectStudentId() { return subjectStudentId; }
    public void setSubjectStudentId(java.util.UUID v) { subjectStudentId = v; }
    public String getCategory() { return category; }
    public void setCategory(String v) { category = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
}
