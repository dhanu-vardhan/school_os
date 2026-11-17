package com.schoolos.people;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.util.UUID;

/** Explicit guardian → child link. RLS scopes it to a tenant; the subject scopes it to a user. */
@Entity
@Table(name = "guardian_child")
public class GuardianChild extends BaseEntity {

    @Column(name = "guardian_subject", nullable = false)
    private String guardianSubject;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "relationship", nullable = false)
    private String relationship = "guardian";

    public String getGuardianSubject() { return guardianSubject; }
    public void setGuardianSubject(String guardianSubject) { this.guardianSubject = guardianSubject; }
    public UUID getStudentId() { return studentId; }
    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
}
