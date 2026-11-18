package com.schoolos.people;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
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

    @Column(name = "holds_parental_authority", nullable = false)
    private boolean holdsParentalAuthority = true;

    @Column(name = "right_to_information", nullable = false)
    private boolean rightToInformation = true;

    @Column(name = "is_financial_payer", nullable = false)
    private boolean financialPayer;

    @Column(name = "is_emergency_contact", nullable = false)
    private boolean emergencyContact;

    @Column(name = "may_collect_child", nullable = false)
    private boolean mayCollectChild = true;

    @Column(name = "status", nullable = false)
    private String status = "active";

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom = LocalDate.now();

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    public String getGuardianSubject() { return guardianSubject; }
    public void setGuardianSubject(String guardianSubject) { this.guardianSubject = guardianSubject; }
    public UUID getStudentId() { return studentId; }
    public void setStudentId(UUID studentId) { this.studentId = studentId; }
    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }
    public boolean isHoldsParentalAuthority() { return holdsParentalAuthority; }
    public void setHoldsParentalAuthority(boolean holdsParentalAuthority) { this.holdsParentalAuthority = holdsParentalAuthority; }
    public boolean isRightToInformation() { return rightToInformation; }
    public void setRightToInformation(boolean rightToInformation) { this.rightToInformation = rightToInformation; }
    public boolean isFinancialPayer() { return financialPayer; }
    public void setFinancialPayer(boolean financialPayer) { this.financialPayer = financialPayer; }
    public boolean isEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(boolean emergencyContact) { this.emergencyContact = emergencyContact; }
    public boolean isMayCollectChild() { return mayCollectChild; }
    public void setMayCollectChild(boolean mayCollectChild) { this.mayCollectChild = mayCollectChild; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDate validFrom) { this.validFrom = validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public void setValidTo(LocalDate validTo) { this.validTo = validTo; }
    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public boolean isActiveOn(LocalDate today) {
        if (!"active".equalsIgnoreCase(status)) return false;
        if (validFrom != null && today.isBefore(validFrom)) return false;
        return validTo == null || !today.isAfter(validTo);
    }
}
