package com.schoolos.analytics;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * JPA-backed fact reads. Native SQL is used deliberately: the governed aggregate layer only
 * needs immutable projections, and forced RLS on every table remains the sole tenant filter.
 * The runtime role has SELECT-only rights on the raw facts (Flyway V6).
 */
@Repository
public class JpaAnalyticsFactSource implements AnalyticsFactSource {

    @PersistenceContext
    private EntityManager em;

    @Override
    public boolean hasAnyFacts() {
        Object result = em.createNativeQuery(
                        "SELECT EXISTS(SELECT 1 FROM analytics_daily_attendance_fact) OR " +
                        "EXISTS(SELECT 1 FROM analytics_assessment_fact) OR " +
                        "EXISTS(SELECT 1 FROM analytics_homework_fact) OR " +
                        "EXISTS(SELECT 1 FROM analytics_finance_fact) OR " +
                        "EXISTS(SELECT 1 FROM analytics_student_term_snapshot)")
                .getSingleResult();
        if (result instanceof Boolean b) return b;
        return "t".equalsIgnoreCase(String.valueOf(result));
    }

    @Override
    public List<AttendanceRow> attendance(Set<UUID> allowedClassIds, AnalyticsFilters filters) {
        if (allowedClassIds != null && allowedClassIds.isEmpty()) return List.of();
        StringBuilder sql = new StringBuilder(
                "SELECT class_id, date, period, term, year, weekday, expected, present, justified, " +
                "unjustified, late, minutes_late_sum, registers_taken, registers_on_time " +
                "FROM analytics_daily_attendance_fact WHERE 1=1");
        Map<String, Object> params = new HashMap<>();
        addClassFilter(sql, params, allowedClassIds);
        addCommonFilters(sql, params, filters, "date");
        List<Object[]> rows = rows(sql, params);
        List<AttendanceRow> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(new AttendanceRow(
                    uuid(r[0]), date(r[1]), integer(r[2]), str(r[3]), str(r[4]), integer(r[5]),
                    number(r[6]), number(r[7]), number(r[8]), number(r[9]), number(r[10]),
                    number(r[11]), number(r[12]), number(r[13])));
        }
        return List.copyOf(out);
    }

    @Override
    public List<AssessmentRow> assessment(Set<UUID> allowedClassIds, AnalyticsFilters filters) {
        if (allowedClassIds != null && allowedClassIds.isEmpty()) return List.of();
        StringBuilder sql = new StringBuilder(
                "SELECT class_id, subject, assessment_key, term, year, mark, coefficient, scale_max, " +
                "dispensed, absent FROM analytics_assessment_fact WHERE 1=1");
        Map<String, Object> params = new HashMap<>();
        addClassFilter(sql, params, allowedClassIds);
        addCommonFilters(sql, params, filters, null);
        if (filters.subject() != null) {
            sql.append(" AND subject = :subject");
            params.put("subject", filters.subject());
        }
        List<Object[]> rows = rows(sql, params);
        List<AssessmentRow> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(new AssessmentRow(
                    uuid(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[4]),
                    decimal(r[5]), decimal(r[6]), decimal(r[7]), bool(r[8]), bool(r[9])));
        }
        return List.copyOf(out);
    }

    @Override
    public List<HomeworkRow> homework(Set<UUID> allowedClassIds, AnalyticsFilters filters) {
        if (allowedClassIds != null && allowedClassIds.isEmpty()) return List.of();
        StringBuilder sql = new StringBuilder(
                "SELECT class_id, period, assigned, submitted, on_time FROM analytics_homework_fact WHERE 1=1");
        Map<String, Object> params = new HashMap<>();
        addClassFilter(sql, params, allowedClassIds);
        if (filters.term() != null) {
            sql.append(" AND period = :term");
            params.put("term", filters.term());
        }
        List<Object[]> rows = rows(sql, params);
        List<HomeworkRow> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(new HomeworkRow(uuid(r[0]), str(r[1]), number(r[2]), number(r[3]), number(r[4])));
        }
        return List.copyOf(out);
    }

    @Override
    public List<FinanceRow> finance(AnalyticsFilters filters) {
        StringBuilder sql = new StringBuilder(
                "SELECT period, invoiced_cents, collected_cents, overdue_cents, invoice_count " +
                "FROM analytics_finance_fact WHERE 1=1");
        Map<String, Object> params = new HashMap<>();
        addCommonFilters(sql, params, filters, null);
        List<Object[]> rows = rows(sql, params);
        List<FinanceRow> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(new FinanceRow(str(r[0]), number(r[1]), number(r[2]), number(r[3]), number(r[4])));
        }
        return List.copyOf(out);
    }

    @Override
    public List<RefreshRow> refreshStates() {
        List<Object[]> rows = rows(new StringBuilder(
                "SELECT fact_name, last_refreshed_at, rows_written, source_available FROM analytics_refresh_state"),
                Map.of());
        List<RefreshRow> out = new ArrayList<>();
        for (Object[] r : rows) {
            out.add(new RefreshRow(str(r[0]), instant(r[1]), integer(r[2]), bool(r[3])));
        }
        return List.copyOf(out);
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(StringBuilder sql, Map<String, Object> params) {
        Query query = em.createNativeQuery(sql.toString());
        params.forEach(query::setParameter);
        return query.getResultList();
    }

    private void addClassFilter(StringBuilder sql, Map<String, Object> params, Set<UUID> allowedClassIds) {
        if (allowedClassIds == null) return;
        sql.append(" AND class_id IN :allowedClasses");
        params.put("allowedClasses", allowedClassIds);
    }

    /** Filters are application filters, never tenant scope; tenant comes from RLS. */
    private void addCommonFilters(StringBuilder sql, Map<String, Object> params,
                                  AnalyticsFilters filters, String dateColumn) {
        if (dateColumn != null && filters.from() != null) {
            sql.append(" AND ").append(dateColumn).append(" >= :fromDate");
            params.put("fromDate", java.sql.Date.valueOf(filters.from()));
        }
        if (dateColumn != null && filters.to() != null) {
            sql.append(" AND ").append(dateColumn).append(" <= :toDate");
            params.put("toDate", java.sql.Date.valueOf(filters.to()));
        }
        if (filters.term() != null) {
            sql.append(" AND term = :term");
            params.put("term", filters.term());
        }
        if (filters.year() != null) {
            sql.append(" AND year = :year");
            params.put("year", filters.year());
        }
    }

    private static UUID uuid(Object value) {
        return value == null ? null : value instanceof UUID u ? u : UUID.fromString(value.toString());
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDate date(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Date d) return d.toLocalDate();
        if (value instanceof LocalDate d) return d;
        return LocalDate.parse(value.toString());
    }

    private static Instant instant(Object value) {
        if (value == null) return null;
        if (value instanceof Timestamp t) return t.toInstant();
        if (value instanceof Instant i) return i;
        return Instant.parse(value.toString());
    }

    private static int integer(Object value) {
        return value == null ? 0 : ((Number) value).intValue();
    }

    private static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private static Double decimal(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }

    private static boolean bool(Object value) {
        if (value instanceof Boolean b) return b;
        return "t".equalsIgnoreCase(String.valueOf(value)) || "true".equalsIgnoreCase(String.valueOf(value));
    }
}
