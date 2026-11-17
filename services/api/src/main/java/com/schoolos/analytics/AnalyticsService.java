package com.schoolos.analytics;

import com.schoolos.analytics.AnalyticsContract.Ci;
import com.schoolos.analytics.AnalyticsContract.DataPoint;
import com.schoolos.analytics.AnalyticsContract.Envelope;
import com.schoolos.analytics.AnalyticsContract.Insight;
import com.schoolos.analytics.AnalyticsContract.Meta;
import com.schoolos.analytics.AnalyticsContract.MetricDefinition;
import com.schoolos.analytics.AnalyticsContract.TablePage;
import com.schoolos.analytics.AnalyticsFactSource.AssessmentRow;
import com.schoolos.analytics.AnalyticsFactSource.AttendanceRow;
import com.schoolos.analytics.AnalyticsFactSource.FinanceRow;
import com.schoolos.analytics.AnalyticsFactSource.HomeworkRow;
import com.schoolos.analytics.AnalyticsStats.Result;
import com.schoolos.analytics.AnalyticsSuppression.Cell;
import com.schoolos.analytics.AnalyticsSuppression.GuardResult;
import com.schoolos.analytics.AnalyticsSuppression.SuppressionResult;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Governed read pipeline. Aggregates come only from tenant-scoped fact tables; when no
 * upstream rows exist it returns an empty payload with sourceAvailable=false and a clear
 * reason — it never invents numbers (A8-4). Suppression is applied before serialization on
 * every view (A8-3); risk copy is supportive-only and DPO-review gated (A8-6).
 */
@Service
public class AnalyticsService {

    private static final Map<String, Integer> N_MIN = Map.ofEntries(
            Map.entry("attendance.rate", 20),
            Map.entry("attendance.unjustified_rate", 20),
            Map.entry("attendance.justified_rate", 20),
            Map.entry("attendance.lateness_rate", 20),
            Map.entry("attendance.weekday_period_distribution", 10),
            Map.entry("marks.pass_rate", 5),
            Map.entry("marks.weighted_average", 3),
            Map.entry("engagement.homework_completion_rate", 5),
            Map.entry("engagement.on_time_submission_rate", 5),
            Map.entry("finance.collection_rate", 20),
            Map.entry("dq.register_timeliness", 20),
            Map.entry("combined.attendance_attainment", 20),
            Map.entry("combined.risk_composite", 20));

    private static final Set<String> ASSOCIATION_METRICS = Set.of(
            "combined.attendance_attainment", "combined.risk_composite",
            "marks.value_added", "assessment.discrimination");

    private static final Set<String> SUPPORTIVE_METRICS = Set.of(
            "attendance.chronic_flag", "combined.risk_composite");

    private static final String SUPPORT_NOTICE =
            "A prompt for a human check-in, not a diagnosis, a label or an automated decision.";
    private static final String ASSOCIATION_NOTICE = "association, not causation";

    private static final Map<String, String> FORMULAS = Map.ofEntries(
            Map.entry("attendance.rate", "present_half_days / expected_half_days (open school days only)"),
            Map.entry("attendance.unjustified_rate", "unjustified_half_days / expected_half_days"),
            Map.entry("attendance.justified_rate", "justified_half_days / expected_half_days"),
            Map.entry("attendance.lateness_rate", "late_sessions / expected_sessions"),
            Map.entry("marks.pass_rate", "count(mark_normalised_20 >= 10) / count(assessed marks)"),
            Map.entry("engagement.homework_completion_rate", "submitted_assignments / assigned_assignments"),
            Map.entry("finance.collection_rate", "collected_cents / invoiced_cents"),
            Map.entry("dq.register_timeliness", "registers_on_time / registers_taken"),
            Map.entry("combined.risk_composite", "weighted sum of transparent factors; " + SUPPORT_NOTICE));

    private final AnalyticsFactSource source;
    private final AnalyticsPolicyService policyService;

    public AnalyticsService(AnalyticsFactSource source, AnalyticsPolicyService policyService) {
        this.source = source;
        this.policyService = policyService;
    }

    // ------------------------------------------------------------------ endpoints

    /** Governed dictionary: metric ids, formulas and mandatory caveats only; no data. */
    public List<MetricDefinition> dictionary() {
        return N_MIN.keySet().stream().sorted()
                .map(id -> new MetricDefinition(
                        id,
                        FORMULAS.getOrDefault(id, "See docs/METRIC_DICTIONARY.md"),
                        N_MIN.get(id),
                        ASSOCIATION_METRICS.contains(id),
                        SUPPORTIVE_METRICS.contains(id),
                        ASSOCIATION_METRICS.contains(id) ? ASSOCIATION_NOTICE
                                : SUPPORTIVE_METRICS.contains(id) ? SUPPORT_NOTICE : null))
                .toList();
    }

    public Envelope<Map<String, Object>> meta(AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters);
        boolean available = source.hasAnyFacts();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("version", "1.0.0");
        data.put("metricIds", List.copyOf(N_MIN.keySet()));
        data.put("suppressionThreshold", scope.suppressionThreshold());
        data.put("sourceAvailable", available);
        data.put("mock", false);
        if (!available) {
            data.put("reason", "No upstream attendance, assessment, homework or finance facts are loaded.");
        }
        return new Envelope<>(data, Meta.empty(scope.suppressionThreshold()));
    }

    public Envelope<List<DataPoint>> overview(AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters);
        if (scopedChildOnly(scope)) return scopedNotAvailable(scope, List.of());
        if (!source.hasAnyFacts()) return noSource(scope, List.of());

        List<DataPoint> points = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        long totalN = 0;
        for (String metricId : List.of("attendance.rate", "engagement.homework_completion_rate",
                "finance.collection_rate")) {
            Envelope<List<DataPoint>> result = compute(metricId, filters, scope, false);
            if (!result.data().isEmpty()) {
                points.addAll(result.data());
                ids.add(metricId);
                totalN += result.meta().n();
            }
        }
        if (points.isEmpty()) return noSource(scope, List.of());
        Meta meta = new Meta(List.copyOf(ids), totalN, "open school days / assigned work / invoiced cents",
                null, points.stream().anyMatch(DataPoint::suppressed), scope.suppressionThreshold(),
                points.stream().anyMatch(p -> p.n() < 20), now(), false, true,
                Map.of("sourceAvailable", true, "note", "Aggregate first; no individual rows returned."), false);
        return new Envelope<>(List.copyOf(points), meta);
    }

    public Envelope<List<DataPoint>> series(String metricId, AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters, metricId);
        if (scopedChildOnly(scope)) return scopedNotAvailable(scope, List.of());
        return compute(metricId, filters, scope, false);
    }

    public Envelope<TablePage> table(String metricId, AnalyticsFilters filters, int page, int pageSize) {
        AnalyticsScope scope = policyService.resolve(filters, metricId);
        if (scopedChildOnly(scope)) return scopedNotAvailable(scope, TablePage.empty(page, pageSize));
        Envelope<List<DataPoint>> computed = compute(metricId, filters, scope, true);
        List<DataPoint> all = computed.data();
        int from = Math.min(page * pageSize, all.size());
        int to = Math.min(from + pageSize, all.size());
        TablePage pageData = new TablePage(List.copyOf(all.subList(from, to)), all.size(), page, pageSize);
        return new Envelope<>(pageData, computed.meta());
    }

    public Envelope<List<List<DataPoint>>> matrix(String metricId, AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters, metricId);
        if (scopedChildOnly(scope)) return scopedNotAvailable(scope, List.of());
        if (!source.hasAnyFacts()) return noSource(scope, List.of());

        List<AttendanceRow> rows = source.attendance(scope.allowedClassIds(), filters);
        if (rows.isEmpty()) return noSource(scope, List.of());

        // Heatmap of weekday × period. Keys are ordinals so cells stay stable and non-sensitive.
        Map<String, Mutable> cells = new LinkedHashMap<>();
        for (AttendanceRow row : rows) {
            if (row.weekday() == null || row.period() == null) continue;
            String key = row.weekday() + "|" + row.period();
            Mutable m = cells.computeIfAbsent(key, k -> new Mutable(k, k));
            addAttendance(m, row, "attendance.lateness_rate");
        }
        List<Cell> suppressionCells = cells.values().stream()
                .map(m -> Cell.of(m.key, m.label, m.n, percentOf(m), percentOf(m) * m.n))
                .sorted(Comparator.comparing(Cell::key))
                .toList();
        int threshold = scope.suppressionThreshold();
        SuppressionResult suppressed = AnalyticsSuppression.suppressCells(suppressionCells, threshold);

        Map<Integer, List<DataPoint>> byWeekday = suppressed.cells().stream()
                .map(c -> new DataPoint(c.label(), c.value() == null ? 0 : c.value(), c.n(),
                        null, c.suppressed(), c.key()))
                .collect(Collectors.groupingBy(
                        d -> parseInt(String.valueOf(d.key()).split("\\|", -1)[0]),
                        LinkedHashMap::new, Collectors.toList()));
        List<List<DataPoint>> grid = new ArrayList<>();
        for (int weekday = 1; weekday <= 7; weekday++) {
            List<DataPoint> row = byWeekday.getOrDefault(weekday, List.of());
            if (!row.isEmpty()) grid.add(row);
        }
        if (grid.isEmpty()) return noSource(scope, List.of());

        Meta meta = new Meta(List.of("attendance.weekday_period_distribution"),
                grid.stream().flatMap(List::stream).mapToLong(DataPoint::n).sum(),
                "expected sessions per weekday/period cell",
                null, suppressed.suppressedCells(), threshold,
                grid.stream().flatMap(List::stream).anyMatch(p -> p.n() < 10), now(), false, true,
                Map.of("sourceAvailable", true, "cellThreshold", threshold), false);
        return new Envelope<>(List.copyOf(grid), meta);
    }

    public Envelope<List<Insight>> insights(AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters);
        boolean available = source.hasAnyFacts();
        // Rule-based insights are generated from the governed aggregates only. No AI text in
        // this slice; any future narrative is labelled "AI-generated, review required".
        List<Insight> insights = List.of();
        Meta meta = available
                ? new Meta(List.of(), 0L, null, null, false, scope.suppressionThreshold(), false,
                        now(), false, true,
                        Map.of("sourceAvailable", true, "note", "No rule fired on the current aggregates."), false)
                : Meta.noSource("No upstream facts are loaded, so no insight can be evidenced.", scope.suppressionThreshold());
        return new Envelope<>(insights, meta);
    }

    public Envelope<Map<String, Object>> explain(String metricId, AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters, metricId);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("metricId", metricId);
        data.put("formula", FORMULAS.getOrDefault(metricId, "See docs/METRIC_DICTIONARY.md"));
        data.put("nMin", N_MIN.getOrDefault(metricId, 5));
        data.put("suppressionThreshold", scope.suppressionThreshold());
        data.put("denominator", "open school days / assessed marks / assigned work as defined in the dictionary");
        data.put("exclusions", "dispensed and absent marks, non-school days");
        if (ASSOCIATION_METRICS.contains(metricId)) data.put("caveat", ASSOCIATION_NOTICE);
        if (SUPPORTIVE_METRICS.contains(metricId)) data.put("caveat", SUPPORT_NOTICE);
        boolean available = source.hasAnyFacts();
        data.put("sourceAvailable", available);
        boolean association = ASSOCIATION_METRICS.contains(metricId);
        Meta meta = new Meta(List.of(metricId), 0L, null, null, false, scope.suppressionThreshold(), false,
                now(), false, available, Map.of(), association);
        return new Envelope<>(data, meta);
    }

    public Envelope<List<Map<String, Object>>> refreshState(AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters);
        List<Map<String, Object>> rows = source.refreshStates().stream()
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("factName", r.factName());
                    row.put("lastRefreshedAt", r.lastRefreshedAt() == null ? null : r.lastRefreshedAt().toString());
                    row.put("rowsWritten", r.rowsWritten());
                    row.put("sourceAvailable", r.sourceAvailable());
                    return row;
                })
                .toList();
        if (rows.isEmpty()) {
            return new Envelope<>(rows, Meta.noSource(
                    "No refresh watermark has been recorded yet; no facts are available.",
                    scope.suppressionThreshold()));
        }
        Meta meta = new Meta(List.of(), rows.size(), null, null, false, scope.suppressionThreshold(), false,
                now(), false, rows.stream().anyMatch(r -> Boolean.TRUE.equals(r.get("sourceAvailable"))),
                Map.of(), false);
        return new Envelope<>(rows, meta);
    }

    public Envelope<String> export(ExportRequest request, AnalyticsFilters filters) {
        AnalyticsScope scope = policyService.resolve(filters);
        policyService.requireExport(); // sensitive: step-up enforced + audited here
        boolean available = source.hasAnyFacts();
        StringBuilder csv = new StringBuilder("metric,label,n,value,ci_lower,ci_upper,suppressed\n");
        long n = 0;
        if (available) {
            for (String metricId : request.metricIdsOrEmpty()) {
                Envelope<List<DataPoint>> computed = compute(metricId, filters, scope, false);
                n += computed.meta().n();
                for (DataPoint p : computed.data()) {
                    csv.append(csvCell(metricId)).append(',').append(csvCell(p.label())).append(',')
                            .append(p.n()).append(',').append(p.value()).append(',')
                            .append(p.ci() == null ? "" : p.ci().lower()).append(',')
                            .append(p.ci() == null ? "" : p.ci().upper()).append(',')
                            .append(p.suppressed()).append('\n');
                }
            }
        }
        Meta meta = new Meta(List.copyOf(request.metricIdsOrEmpty()), n, null, null, false,
                scope.suppressionThreshold(), false, now(), false, available,
                Map.of("format", request.format(), "sourceAvailable", available,
                        "note", available ? "Confidential · generated by SchoolOS"
                                : "No upstream facts; header-only export."),
                false);
        return new Envelope<>(csv.toString(), meta);
    }

    // -------------------------------------------------------------- computation core

    private Envelope<List<DataPoint>> compute(String metricId, AnalyticsFilters filters,
                                              AnalyticsScope scope, boolean byClass) {
        if (!source.hasAnyFacts()) return noSource(scope, List.of());
        List<RateRow> rows = rateRows(metricId, filters, scope, byClass);
        if (rows.isEmpty()) return noSource(scope, List.of());

        long totalN = rows.stream().mapToLong(RateRow::n).sum();
        GuardResult guard = AnalyticsSuppression.guardFilteredGroupSize(totalN, scope.suppressionThreshold());
        if (!guard.allowed()) {
            Meta meta = new Meta(List.of(metricId), totalN, denominator(metricId), null, true,
                    scope.suppressionThreshold(), true, now(), false, true,
                    Map.of("reason", guard.reason(), "sourceAvailable", true),
                    ASSOCIATION_METRICS.contains(metricId));
            return new Envelope<>(List.of(), meta);
        }

        int threshold = scope.suppressionThreshold();
        List<Cell> cells = new ArrayList<>();
        Map<String, Ci> ciByKey = new LinkedHashMap<>();
        for (RateRow row : rows) {
            Result metric = AnalyticsStats.rateMetric(row.successes(), row.trials(), "numerator");
            ciByKey.put(row.key(), metric.ci());
            // numerator is kept on the same percent scale as value so a merged "other"
            // cell recomputes a weighted percentage, never a ratio/percent mismatch.
            cells.add(Cell.of(row.key(), row.label(), row.n(),
                    metric.value(), metric.value() * row.n()));
        }
        SuppressionResult suppressed = AnalyticsSuppression.suppressCells(cells, threshold);
        List<DataPoint> points = suppressed.cells().stream()
                .map(c -> new DataPoint(c.suppressed() ? c.key() : c.label(),
                        c.value() == null ? 0 : c.value(), c.n(),
                        c.suppressed() ? null : ciByKey.get(c.key()), c.suppressed(), c.key()))
                .toList();

        double totalSuccesses = rows.stream().mapToDouble(RateRow::successes).sum();
        double totalTrials = rows.stream().mapToDouble(RateRow::trials).sum();
        Ci headlineCi = totalTrials > 0
                ? AnalyticsStats.rateMetric(totalSuccesses, totalTrials, "numerator").ci()
                : null;
        boolean association = ASSOCIATION_METRICS.contains(metricId);
        Map<String, Object> explain = new LinkedHashMap<>();
        explain.put("sourceAvailable", true);
        explain.put("numerator", totalSuccesses);
        explain.put("expected", totalTrials);
        if (SUPPORTIVE_METRICS.contains(metricId)) explain.put("caveat", SUPPORT_NOTICE);
        if (association) explain.put("caveat", ASSOCIATION_NOTICE);
        Meta meta = new Meta(List.of(metricId), totalN, denominator(metricId), headlineCi,
                suppressed.suppressedCells(), threshold,
                AnalyticsSuppression.isLowSample(totalN, N_MIN.getOrDefault(metricId, 5)),
                now(), false, true, Map.copyOf(explain), association);
        return new Envelope<>(List.copyOf(points), meta);
    }

    private List<RateRow> rateRows(String metricId, AnalyticsFilters filters,
                                   AnalyticsScope scope, boolean byClass) {
        return switch (metricId) {
            case "attendance.rate", "attendance.unjustified_rate", "attendance.justified_rate",
                    "attendance.lateness_rate", "dq.register_timeliness" -> attendanceRows(
                    metricId, source.attendance(scope.allowedClassIds(), filters), filters.grain(), byClass);
            case "marks.pass_rate" -> assessmentRows(source.assessment(scope.allowedClassIds(), filters), byClass);
            case "attendance.weekday_period_distribution" -> weekdayRows(
                    source.attendance(scope.allowedClassIds(), filters));
            case "engagement.homework_completion_rate" -> homeworkRows(
                    source.homework(scope.allowedClassIds(), filters),
                    "engagement.homework_completion_rate", byClass);
            case "engagement.on_time_submission_rate" -> homeworkRows(
                    source.homework(scope.allowedClassIds(), filters),
                    "engagement.on_time_submission_rate", byClass);
            case "finance.collection_rate" -> financeRows(source.finance(filters));
            default -> List.of(); // unknown metric id => empty, never fabricated
        };
    }

    private List<RateRow> attendanceRows(String metricId, List<AttendanceRow> rows,
                                         String grain, boolean byClass) {
        Map<String, Mutable> acc = new LinkedHashMap<>();
        for (AttendanceRow row : rows) {
            String key = byClass ? "class:" + row.classId() : bucket(row.date(), row.term(), row.year(), grain);
            Mutable m = acc.computeIfAbsent(key, k -> new Mutable(k, k));
            addAttendance(m, row, metricId);
        }
        return toRateRows(acc);
    }

    private List<RateRow> weekdayRows(List<AttendanceRow> rows) {
        Map<String, Mutable> acc = new LinkedHashMap<>();
        for (AttendanceRow row : rows) {
            String key = row.weekday() + "|" + row.period();
            Mutable m = acc.computeIfAbsent(key, k -> new Mutable(k, k));
            addAttendance(m, row, "attendance.lateness_rate");
        }
        return toRateRows(acc);
    }

    private void addAttendance(Mutable m, AttendanceRow row, String metricId) {
        switch (metricId) {
            case "attendance.unjustified_rate" -> { m.successes += row.unjustified(); m.trials += row.expected(); }
            case "attendance.justified_rate" -> { m.successes += row.justified(); m.trials += row.expected(); }
            case "attendance.lateness_rate" -> { m.successes += row.late(); m.trials += row.expected(); }
            case "dq.register_timeliness" -> { m.successes += row.registersOnTime(); m.trials += row.registersTaken(); }
            default -> { m.successes += row.present(); m.trials += row.expected(); }
        }
        m.n += metricId.equals("dq.register_timeliness") ? row.registersTaken() : row.expected();
        m.classId = row.classId();
    }

    private List<RateRow> assessmentRows(List<AssessmentRow> rows, boolean byClass) {
        Map<String, Mutable> acc = new LinkedHashMap<>();
        for (AssessmentRow row : rows) {
            if (row.dispensed() || row.absent() || row.mark() == null || row.scaleMax() == null
                    || row.scaleMax() <= 0) continue;
            double normalised = row.mark() / row.scaleMax() * 20;
            String key = byClass ? "class:" + row.classId() : "subject:" + row.subject();
            Mutable m = acc.computeIfAbsent(key, k -> new Mutable(k, k));
            m.successes += normalised >= 10 ? 1 : 0;
            m.trials += 1;
            m.n += 1;
            m.subject = row.subject();
        }
        return toRateRows(acc);
    }

    private List<RateRow> homeworkRows(List<HomeworkRow> rows, String metricId, boolean byClass) {
        Map<String, Mutable> acc = new LinkedHashMap<>();
        for (HomeworkRow row : rows) {
            String key = byClass ? "class:" + row.classId() : "period:" + row.period();
            Mutable m = acc.computeIfAbsent(key, k -> new Mutable(k, k));
            if (metricId.equals("engagement.on_time_submission_rate")) {
                m.successes += row.onTime();
                m.trials += row.submitted();
                m.n += row.submitted();
            } else {
                m.successes += row.submitted();
                m.trials += row.assigned();
                m.n += row.assigned();
            }
        }
        return toRateRows(acc);
    }

    private List<RateRow> financeRows(List<FinanceRow> rows) {
        Map<String, Mutable> acc = new LinkedHashMap<>();
        for (FinanceRow row : rows) {
            Mutable m = acc.computeIfAbsent(row.period(), k -> new Mutable(k, k));
            m.successes += row.collectedCents();
            m.trials += row.invoicedCents();
            m.n += row.invoiceCount(); // n is invoice count, not cents
        }
        return toRateRows(acc);
    }

    private static List<RateRow> toRateRows(Map<String, Mutable> acc) {
        return acc.values().stream()
                .map(m -> new RateRow(m.key, m.label, m.classId, m.subject,
                        m.successes, m.trials, m.n > 0 ? m.n : (long) m.trials))
                .sorted(Comparator.comparing(RateRow::key))
                .toList();
    }

    private static String bucket(LocalDate date, String term, String year, String grain) {
        if ("term".equals(grain)) return (term == null ? "term" : term) + " " + (year == null ? "" : year);
        if (date == null || grain == null) return "all";
        return switch (grain) {
            case "day" -> date.toString();
            case "week" -> date.get(IsoFields.WEEK_BASED_YEAR) + "-W" + date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            case "month" -> YearMonth.from(date).toString();
            case "year" -> String.valueOf(date.getYear());
            default -> "all";
        };
    }

    private static String denominator(String metricId) {
        return switch (metricId) {
            case "finance.collection_rate" -> "invoiced cents, written-off invoices excluded";
            case "marks.pass_rate" -> "assessed marks on /20, dispensed and absent excluded";
            case "engagement.homework_completion_rate" -> "assigned homework, exempted work excluded";
            case "dq.register_timeliness" -> "expected registers, not a teacher performance score";
            default -> "expected half-days, open school days only";
        };
    }

    private static double percentOf(Mutable m) {
        return m.trials > 0 ? m.successes / m.trials * 100 : 0;
    }

    private static boolean scopedChildOnly(AnalyticsScope scope) {
        return scope.allowedStudentKeys() != null;
    }

    private <T> Envelope<T> scopedNotAvailable(AnalyticsScope scope, T empty) {
        return new Envelope<>(empty, Meta.noSource(
                "Scoped child/self analytics require the authorised student fact feed, which is not loaded.",
                scope.suppressionThreshold()));
    }

    private <T> Envelope<T> noSource(AnalyticsScope scope, T emptyData) {
        return new Envelope<>(emptyData, Meta.empty(scope.suppressionThreshold()));
    }

    private static String now() {
        return Instant.now().toString();
    }

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        return escaped.contains(",") || escaped.contains("\n") ? "\"" + escaped + "\"" : escaped;
    }

    private static int parseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private record RateRow(String key, String label, UUID classId, String subject,
                           double successes, double trials, long n) {}

    private static final class Mutable {
        private final String key;
        private final String label;
        private double successes;
        private double trials;
        private long n;
        private UUID classId;
        private String subject;

        private Mutable(String key, String label) {
            this.key = key;
            this.label = label;
        }
    }
}
