package com.schoolos.tenancy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "membership")
public class Membership extends BaseEntity {

    @Column(name = "user_subject", nullable = false)
    private String userSubject;

    @Column(name = "user_email")
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private SchoolRole role;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public String getUserSubject() { return userSubject; }
    public void setUserSubject(String userSubject) { this.userSubject = userSubject; }
    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
    public SchoolRole getRole() { return role; }
    public void setRole(SchoolRole role) { this.role = role; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
