package com.schoolos.analytics;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A user's saved dashboard filters. Contains no metric values or personal data. */
@Entity
@Table(name = "analytics_saved_view")
public class AnalyticsSavedView extends BaseEntity {

    @Column(name = "owner_sub", nullable = false)
    private String ownerSub;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "dashboard", nullable = false)
    private String dashboard;

    @Column(name = "filters", nullable = false, columnDefinition = "text")
    private String filters;

    public String getOwnerSub() { return ownerSub; }
    public void setOwnerSub(String ownerSub) { this.ownerSub = ownerSub; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDashboard() { return dashboard; }
    public void setDashboard(String dashboard) { this.dashboard = dashboard; }
    public String getFilters() { return filters; }
    public void setFilters(String filters) { this.filters = filters; }
}
