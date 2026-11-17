package com.schoolos.activities;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "activity_offering")
public class ActivityOffering extends BaseEntity {
    @Column(name = "activity_id", nullable = false) private java.util.UUID activityId;
    @Column(name = "term") private String term;
    @Column(name = "capacity", nullable = false) private int capacity;
    @Column(name = "min_enrolment", nullable = false) private int minEnrolment;
    @Column(name = "price_cents", nullable = false) private int priceCents;
    @Column(name = "currency", nullable = false) private String currency = "EUR";
    @Column(name = "registration_open_at") private OffsetDateTime registrationOpenAt;
    @Column(name = "registration_close_at") private OffsetDateTime registrationCloseAt;
    @Column(name = "status", nullable = false) private String status = "draft";
    @Column(name = "location") private String location;
    public java.util.UUID getActivityId() { return activityId; }
    public void setActivityId(java.util.UUID v) { activityId = v; }
    public String getTerm() { return term; }
    public void setTerm(String v) { term = v; }
    public int getCapacity() { return capacity; }
    public void setCapacity(int v) { capacity = v; }
    public int getMinEnrolment() { return minEnrolment; }
    public void setMinEnrolment(int v) { minEnrolment = v; }
    public int getPriceCents() { return priceCents; }
    public void setPriceCents(int v) { priceCents = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { currency = v; }
    public OffsetDateTime getRegistrationOpenAt() { return registrationOpenAt; }
    public void setRegistrationOpenAt(OffsetDateTime v) { registrationOpenAt = v; }
    public OffsetDateTime getRegistrationCloseAt() { return registrationCloseAt; }
    public void setRegistrationCloseAt(OffsetDateTime v) { registrationCloseAt = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }
    public String getLocation() { return location; }
    public void setLocation(String v) { location = v; }
}
