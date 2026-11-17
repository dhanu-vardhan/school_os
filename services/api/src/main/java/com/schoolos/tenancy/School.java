package com.schoolos.tenancy;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "school")
public class School extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "timezone", nullable = false)
    private String timezone = "Europe/Paris";

    @Column(name = "locale", nullable = false)
    private String locale = "fr";

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public String getLocale() { return locale; }
    public void setLocale(String locale) { this.locale = locale; }
}
