package com.schoolos.analytics;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Java mirror of {@code packages/shared/src/metrics/types.ts}. The wire shape is identical
 * to the TS contract so the governed API and the flagged demo adapter are interchangeable;
 * {@code sourceAvailable} is an additional honest signal (no upstream facts => false).
 *
 * <p>These are serialization DTOs only. No entity, no business logic, no personal data.
 */
public final class AnalyticsContract {

    private AnalyticsContract() {}

    public record Ci(double lower, double upper, String method, double confidence) {}

    public record Meta(
            List<String> metricIds,
            long n,
            String denominator,
            Ci ci,
            boolean suppressedCells,
            int suppressionThreshold,
            boolean lowSample,
            String dataAsOf,
            boolean mock,
            boolean sourceAvailable,
            Map<String, Object> explain,
            boolean associationNotCausation) {

        /** Explicit "no upstream source" response: never fabricate values or zero rows. */
        public static Meta noSource(String reason, int threshold) {
            return new Meta(
                    List.of(), 0L, null, null, false, threshold, false,
                    Instant.now().toString(), false, false,
                    Map.of("reason", reason, "sourceAvailable", false), false);
        }

        public static Meta empty(int threshold) {
            return noSource("No upstream analytics facts are available for this school.", threshold);
        }
    }

    public record Envelope<T>(T data, Meta meta) {}

    public record DataPoint(
            String label, double value, long n, Ci ci, boolean suppressed, String key) {}

    public record TablePage(List<DataPoint> rows, long total, int page, int pageSize) {
        public static TablePage empty(int page, int pageSize) {
            return new TablePage(List.of(), 0L, page, pageSize);
        }
    }

    /** Rule-based, supportive-only insight copy. Never a label about a child or a teacher. */
    public record Insight(
            String id,
            String severity,
            String title,
            List<String> metricIds,
            String evidence,
            String suggestedAction) {}

    /** Governed metric dictionary entry; mirrors docs/METRIC_DICTIONARY.md. */
    public record MetricDefinition(
            String id,
            String formula,
            int nMin,
            boolean association,
            boolean supportive,
            String caveat) {}
}
