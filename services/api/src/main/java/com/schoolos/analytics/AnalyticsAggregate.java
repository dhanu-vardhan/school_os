package com.schoolos.analytics;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Pre-computed aggregate cell. @Version is inherited from BaseEntity (optimistic locking). */
@Entity
@Table(name = "analytics_aggregate_daily")
public class AnalyticsAggregate extends BaseEntity {

    @Column(name = "metric_id", nullable = false)
    private String metricId;

    @Column(name = "grain", nullable = false)
    private String grain;

    @Column(name = "period", nullable = false)
    private String period;

    @Column(name = "class_id")
    private UUID classId;

    @Column(name = "subject")
    private String subject;

    @Column(name = "value")
    private BigDecimal value;

    @Column(name = "n", nullable = false)
    private int n;

    @Column(name = "numerator")
    private BigDecimal numerator;

    @Column(name = "ci_lower")
    private BigDecimal ciLower;

    @Column(name = "ci_upper")
    private BigDecimal ciUpper;

    @Column(name = "suppressed", nullable = false)
    private boolean suppressed;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt = Instant.now();

    public String getMetricId() { return metricId; }
    public void setMetricId(String metricId) { this.metricId = metricId; }
    public String getGrain() { return grain; }
    public void setGrain(String grain) { this.grain = grain; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public UUID getClassId() { return classId; }
    public void setClassId(UUID classId) { this.classId = classId; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }
    public int getN() { return n; }
    public void setN(int n) { this.n = n; }
    public BigDecimal getNumerator() { return numerator; }
    public void setNumerator(BigDecimal numerator) { this.numerator = numerator; }
    public BigDecimal getCiLower() { return ciLower; }
    public void setCiLower(BigDecimal ciLower) { this.ciLower = ciLower; }
    public BigDecimal getCiUpper() { return ciUpper; }
    public void setCiUpper(BigDecimal ciUpper) { this.ciUpper = ciUpper; }
    public boolean isSuppressed() { return suppressed; }
    public void setSuppressed(boolean suppressed) { this.suppressed = suppressed; }
    public Instant getComputedAt() { return computedAt; }
    public void setComputedAt(Instant computedAt) { this.computedAt = computedAt; }
}
