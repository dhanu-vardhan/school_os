package com.schoolos.analytics;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Writes explicit "no upstream source" watermarks. No fact row is ever inserted here: with
 * no Part 3 attendance/grade/finance tables the only honest state is source_available=false
 * and rows_written=0 (A8-4). Only derived tables are writable by schoolos_app (Flyway V6).
 */
@Service
public class AnalyticsRefreshService {

    public static final List<String> FACT_NAMES = List.of(
            "analytics_daily_attendance_fact",
            "analytics_assessment_fact",
            "analytics_homework_fact",
            "analytics_finance_fact",
            "analytics_student_term_snapshot");

    private final RefreshStateRepository refreshStates;

    public AnalyticsRefreshService(RefreshStateRepository refreshStates) {
        this.refreshStates = refreshStates;
    }

    /**
     * Called once per tenant; the caller sets TenantContext BEFORE this method so the
     * transaction-local set_config('app.current_school', ...) is bound at connection time.
     * RLS WITH CHECK still restricts every write to the JWT tenant.
     */
    @Transactional
    public int recordNoSource(UUID schoolId) {
        int written = 0;
        for (String factName : FACT_NAMES) {
            RefreshState state = refreshStates.findByFactName(factName).orElseGet(RefreshState::new);
            state.setSchoolId(schoolId);
            state.setFactName(factName);
            state.setLastSourceCursor(null);
            state.setLastRefreshedAt(Instant.now());
            state.setRowsWritten(0);
            state.setSourceAvailable(false);
            state.touch();
            refreshStates.save(state);
            written++;
        }
        return written;
    }
}
