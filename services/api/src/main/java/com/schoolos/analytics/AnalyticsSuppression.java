package com.schoolos.analytics;

import java.util.ArrayList;
import java.util.List;

/**
 * Java mirror of packages/analytics-core/src/suppression.ts (A8-3). Suppression is applied
 * BEFORE serialization on every view so a filtered response can never reveal a group that
 * an unfiltered response hid (differencing). Threshold defaults to 5 and is clamped 3–20.
 */
public final class AnalyticsSuppression {

    public static final int DEFAULT_THRESHOLD = 5;
    public static final int MIN_THRESHOLD = 3;
    public static final int MAX_THRESHOLD = 20;
    public static final String OTHER_LABEL = "Autres / Other";

    private AnalyticsSuppression() {}

    public record Cell(String key, String label, long n, Double value, Double numerator, boolean suppressed) {
        public static Cell of(String key, String label, long n, Double value, Double numerator) {
            return new Cell(key, label, n, value, numerator, false);
        }
    }

    public record SuppressionResult(List<Cell> cells, boolean suppressedCells, int hiddenGroups) {}

    public record MatrixResult(List<List<Cell>> rows, boolean suppressedCells, int hiddenGroups) {}

    public record GuardResult(boolean allowed, boolean suppressed, String reason) {}

    public static boolean isDisplayable(long n, int threshold) {
        return n >= threshold;
    }

    /** Safe default 5; out-of-range values are clamped, never rejected with an error. */
    public static int normalizeThreshold(Integer value) {
        if (value == null) return DEFAULT_THRESHOLD;
        return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, value));
    }

    /** Refuse to emit data for a filtered group below the floor. */
    public static GuardResult guardFilteredGroupSize(long estimatedGroupSize, int threshold) {
        if (estimatedGroupSize < threshold) {
            return new GuardResult(false, true,
                    "Filtered group (n=" + estimatedGroupSize + ") is below the suppression threshold ("
                            + threshold + ").");
        }
        return new GuardResult(true, false, null);
    }

    /** True when a metric's own n_min is not met: UI shows a low-sample badge, not a precise value. */
    public static boolean isLowSample(long n, int metricMin) {
        return n < metricMin;
    }

    /** Suppress small cells and merge them into one “other” cell (recomputed from numerators). */
    public static SuppressionResult suppressCells(List<Cell> cells, int threshold) {
        return suppressCells(cells, threshold, OTHER_LABEL);
    }

    public static SuppressionResult suppressCells(List<Cell> cells, int threshold, String otherLabel) {
        List<Cell> kept = new ArrayList<>();
        List<Cell> hidden = new ArrayList<>();
        for (Cell cell : cells) {
            if (isDisplayable(cell.n(), threshold)) {
                kept.add(new Cell(cell.key(), cell.label(), cell.n(), cell.value(), cell.numerator(), false));
            } else {
                hidden.add(cell);
            }
        }
        if (hidden.isEmpty()) return new SuppressionResult(kept, false, 0);

        long mergedN = hidden.stream().mapToLong(Cell::n).sum();
        if (isDisplayable(mergedN, threshold)) {
            boolean allHaveNumerators = hidden.stream().allMatch(c -> c.numerator() != null);
            Double numerator = allHaveNumerators
                    ? hidden.stream().mapToDouble(c -> c.numerator()).sum()
                    : null;
            double value = numerator != null
                    ? numerator / mergedN
                    : hidden.stream().mapToDouble(c -> (c.value() == null ? 0 : c.value()) * c.n()).sum() / mergedN;
            kept.add(new Cell("__suppressed_other__", otherLabel, mergedN, value, numerator, true));
        }
        return new SuppressionResult(kept, true, hidden.size());
    }

    /** Heatmap/table suppression: every leaf below threshold becomes null (rendered as a hatch). */
    public static MatrixResult suppressMatrix(List<List<Cell>> rows, int threshold) {
        List<List<Cell>> out = new ArrayList<>();
        boolean anySuppressed = false;
        int hidden = 0;
        for (List<Cell> row : rows) {
            List<Cell> mapped = new ArrayList<>();
            for (Cell cell : row) {
                if (isDisplayable(cell.n(), threshold)) {
                    mapped.add(new Cell(cell.key(), cell.label(), cell.n(), cell.value(), cell.numerator(), false));
                } else {
                    anySuppressed = true;
                    hidden++;
                    mapped.add(null);
                }
            }
            // List.copyOf() rejects nulls; suppressed leaves are intentionally null.
            out.add(java.util.Collections.unmodifiableList(new ArrayList<>(mapped)));
        }
        return new MatrixResult(out, anySuppressed, hidden);
    }
}
