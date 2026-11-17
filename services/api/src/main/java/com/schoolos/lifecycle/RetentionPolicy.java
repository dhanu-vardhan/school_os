package com.schoolos.lifecycle;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "retention_policy")
public class RetentionPolicy extends BaseEntity {
    @Column(name = "data_type", nullable = false) private String dataType;
    @Column(name = "retention_days", nullable = false) private int retentionDays;
    @Column(name = "action", nullable = false) private String action = "delete";
    public String getDataType() { return dataType; }
    public void setDataType(String v) { dataType = v; }
    public int getRetentionDays() { return retentionDays; }
    public void setRetentionDays(int v) { retentionDays = v; }
    public String getAction() { return action; }
    public void setAction(String v) { action = v; }
}
