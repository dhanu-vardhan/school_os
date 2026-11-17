package com.schoolos.analytics;

import java.util.Map;

/**
 * Java mirror of packages/analytics-core/src/stats.ts + metrics.ts. Formulae and rounding
 * must stay identical to the TypeScript implementation; shared fixtures live in
 * {@code src/test/resources/analytics/golden.json}. No statistic is introduced without a
 * METRIC_DICTIONARY.md entry.
 */
public final class AnalyticsStats {

    private AnalyticsStats() {}

    public record Result(double value, long n, AnalyticsContract.Ci ci, Map<String, Object> explain) {}

    /** Acklam's rational approximation, |error| < 1.15e-9. */
    public static double normalQuantile(double p) {
        if (p <= 0 || p >= 1) throw new IllegalArgumentException("p must be in (0,1)");
        double[] a = {-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
                1.38357751867269e2, -3.066479806614716e1, 2.506628277459239};
        double[] b = {-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
                6.680131188771972e1, -1.328068155288572e1};
        double[] c = {-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
                -2.549732539343734, 4.374664141464968, 2.938163982698783};
        double[] d = {7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
                3.754408661907416};
        double low = 0.02425;
        if (p < low) {
            double q = Math.sqrt(-2 * Math.log(p));
            return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
                    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
        }
        if (p > 1 - low) return -normalQuantile(1 - p);
        double q = p - 0.5;
        double r = q * q;
        return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
                (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }

    /** Wilson score interval for a proportion (ratio scale). */
    public static AnalyticsContract.Ci wilsonInterval(double successes, double trials, double confidence) {
        if (trials <= 0) return new AnalyticsContract.Ci(0, 0, "none", confidence);
        double z = normalQuantile(1 - (1 - confidence) / 2);
        double phat = successes / trials;
        double z2 = z * z;
        double denom = 1 + z2 / trials;
        double centre = (phat + z2 / (2 * trials)) / denom;
        double half = (z * Math.sqrt((phat * (1 - phat)) / trials + z2 / (4 * trials * trials))) / denom;
        return new AnalyticsContract.Ci(clamp01(centre - half), clamp01(centre + half), "wilson-95", confidence);
    }

    /** A rate metric: percent value, Wilson 95% CI on the percent scale, n = trials. */
    public static Result rateMetric(double successes, double trials, String label) {
        if (successes < 0 || trials < 0) throw new IllegalArgumentException("counts must be non-negative");
        AnalyticsContract.Ci ci = null;
        if (trials > 0) {
            AnalyticsContract.Ci ratio = wilsonInterval(successes, trials, 0.95);
            ci = new AnalyticsContract.Ci(ratio.lower() * 100, ratio.upper() * 100,
                    ratio.method(), ratio.confidence());
        }
        double value = trials > 0 ? (successes / trials) * 100 : 0;
        return new Result(value, (long) trials, ci, Map.of(label, successes, "expected", trials));
    }

    /** Percent helper (clamped 0–100), used by count-based aggregate metrics. */
    public static double percent(double numerator, double denominator) {
        if (denominator <= 0) return 0;
        return clamp01(numerator / denominator) * 100;
    }

    private static double clamp01(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
