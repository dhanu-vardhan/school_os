package com.schoolos.activities;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "activity")
public class Activity extends BaseEntity {
    @Column(name = "name", nullable = false) private String name;
    @Column(name = "type", nullable = false) private String type;
    @Column(name = "description") private String description;
    @Column(name = "min_age") private Integer minAge;
    @Column(name = "max_age") private Integer maxAge;
    @Column(name = "pedagogical_category") private String pedagogicalCategory;
    public String getName() { return name; }
    public void setName(String v) { name = v; }
    public String getType() { return type; }
    public void setType(String v) { type = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { description = v; }
    public Integer getMinAge() { return minAge; }
    public void setMinAge(Integer v) { minAge = v; }
    public Integer getMaxAge() { return maxAge; }
    public void setMaxAge(Integer v) { maxAge = v; }
    public String getPedagogicalCategory() { return pedagogicalCategory; }
    public void setPedagogicalCategory(String v) { pedagogicalCategory = v; }
}
