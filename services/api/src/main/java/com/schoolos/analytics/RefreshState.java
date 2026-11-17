package com.schoolos.analytics;

import com.schoolos.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Per-school refresh watermark. source_available defaults to false: an absent upstream
 * source is recorded explicitly (A8-4), never replaced with fabricated zero facts.
 */
@Entity
@Table(name = "analytics_refresh_state")
public class RefreshState extends BaseEntity {

    @Column(name = "fact_name", nullable = false)
    private String factName;

    @Column(name = "last_source_cursor")
    private String lastSourceCursor;

    @Column(name = "last_refreshed_at", nullable = false)
    private Instant lastRefreshedAt = Instant.now();

    @Column(name = "rows_written", nullable = false)
    private int rowsWritten;

    @Column(name = "source_available", nullable = false)
    private boolean sourceAvailable;

    public String getFactName() { return factName; }
    public void setFactName(String factName) { this.factName = factName; }
    public String getLastSourceCursor() { return lastSourceCursor; }
    public void setLastSourceCursor(String lastSourceCursor) { this.lastSourceCursor = lastSourceCursor; }
    public Instant getLastRefreshedAt() { return lastRefreshedAt; }
    public void setLastRefreshedAt(Instant lastRefreshedAt) { this.lastRefreshedAt = lastRefreshedAt; }
    public int getRowsWritten() { return rowsWritten; }
    public void setRowsWritten(int rowsWritten) { this.rowsWritten = rowsWritten; }
    public boolean isSourceAvailable() { return sourceAvailable; }
    public void setSourceAvailable(boolean sourceAvailable) { this.sourceAvailable = sourceAvailable; }
}
