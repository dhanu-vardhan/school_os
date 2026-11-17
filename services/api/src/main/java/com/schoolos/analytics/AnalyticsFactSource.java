package com.schoolos.analytics;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Read-only view over the Part 8 fact tables. The real implementation is JPA-backed and
 * relies on forced RLS for tenant isolation; tests substitute an in-memory implementation
 * so AnalyticsService can be verified without a database.
 *
 * <p>No method accepts a school id: the tenant is always the JWT tenant bound by
 * TenantAwareDataSource.set_config('app.current_school', ...).
 */
public interface AnalyticsFactSource {

    record AttendanceRow(
            UUID classId, LocalDate date, Integer period, String term, String year, Integer weekday,
            long expected, long present, long justified, long unjustified, long late,
            long minutesLateSum, long registersTaken, long registersOnTime) {}

    record AssessmentRow(
            UUID classId, String subject, String assessmentKey, String term, String year,
            Double mark, Double coefficient, Double scaleMax, boolean dispensed, boolean absent) {}

    record HomeworkRow(UUID classId, String period, long assigned, long submitted, long onTime) {}

    record FinanceRow(String period, long invoicedCents, long collectedCents, long overdueCents,
                      long invoiceCount) {}

    record RefreshRow(String factName, Instant lastRefreshedAt, int rowsWritten, boolean sourceAvailable) {}

    /** Cheap existence check so an empty response can be marked sourceAvailable=false. */
    boolean hasAnyFacts();

    List<AttendanceRow> attendance(Set<UUID> allowedClassIds, AnalyticsFilters filters);

    List<AssessmentRow> assessment(Set<UUID> allowedClassIds, AnalyticsFilters filters);

    List<HomeworkRow> homework(Set<UUID> allowedClassIds, AnalyticsFilters filters);

    List<FinanceRow> finance(AnalyticsFilters filters);

    List<RefreshRow> refreshStates();
}
