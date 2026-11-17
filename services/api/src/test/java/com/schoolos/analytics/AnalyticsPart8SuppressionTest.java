package com.schoolos.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.common.Uuids;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Suppression-before-serialisation, pagination-safe bounds and shared golden fixtures.
 * Pure unit test: no Spring context, no database.
 */
class AnalyticsPart8SuppressionTest {

    @Test
    void thresholdDefaultsToFiveAndIsClampedToThreeTwenty() {
        assertThat(AnalyticsSuppression.normalizeThreshold(null)).isEqualTo(5);
        assertThat(AnalyticsSuppression.normalizeThreshold(1)).isEqualTo(3);
        assertThat(AnalyticsSuppression.normalizeThreshold(2)).isEqualTo(3);
        assertThat(AnalyticsSuppression.normalizeThreshold(5)).isEqualTo(5);
        assertThat(AnalyticsSuppression.normalizeThreshold(12)).isEqualTo(12);
        assertThat(AnalyticsSuppression.normalizeThreshold(20)).isEqualTo(20);
        assertThat(AnalyticsSuppression.normalizeThreshold(21)).isEqualTo(20);
    }

    @Test
    void smallCellsAreHiddenBeforeSerialisation() {
        List<AnalyticsSuppression.Cell> input = List.of(
                AnalyticsSuppression.Cell.of("a", "A", 4, 80.0, 320.0),
                AnalyticsSuppression.Cell.of("b", "B", 5, 90.0, 450.0),
                AnalyticsSuppression.Cell.of("c", "C", 12, 93.0, 1116.0));

        AnalyticsSuppression.SuppressionResult result =
                AnalyticsSuppression.suppressCells(input, 5);

        assertThat(result.suppressedCells()).isTrue();
        assertThat(result.hiddenGroups()).isEqualTo(1);
        assertThat(result.cells()).extracting(AnalyticsSuppression.Cell::key).containsExactly("b", "c");
        assertThat(result.cells()).noneMatch(cell -> cell.n() < 5);
        assertThat(result.cells()).noneMatch(AnalyticsSuppression.Cell::suppressed);
    }

    @Test
    void hiddenCellsMergeIntoAnExplicitlySuppressedOtherCell() {
        List<AnalyticsSuppression.Cell> input = List.of(
                AnalyticsSuppression.Cell.of("a", "A", 4, 10.0, 40.0),
                AnalyticsSuppression.Cell.of("b", "B", 3, 20.0, 60.0),
                AnalyticsSuppression.Cell.of("c", "C", 30, 50.0, 1500.0));

        AnalyticsSuppression.SuppressionResult result =
                AnalyticsSuppression.suppressCells(input, 5);

        assertThat(result.suppressedCells()).isTrue();
        assertThat(result.hiddenGroups()).isEqualTo(2);
        AnalyticsSuppression.Cell other = result.cells().stream()
                .filter(AnalyticsSuppression.Cell::suppressed)
                .findFirst().orElseThrow();
        assertThat(other.key()).isEqualTo("__suppressed_other__");
        assertThat(other.n()).isEqualTo(7);
        assertThat(other.value()).isEqualTo(100.0 / 7.0, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void matrixLeavesNullsForSuppressedLeaves() {
        List<List<AnalyticsSuppression.Cell>> rows = List.of(List.of(
                AnalyticsSuppression.Cell.of("a", "A", 4, 10.0, null),
                AnalyticsSuppression.Cell.of("b", "B", 8, 12.0, null)));
        AnalyticsSuppression.MatrixResult result = AnalyticsSuppression.suppressMatrix(rows, 5);
        assertThat(result.rows().get(0).get(0)).isNull();
        assertThat(result.rows().get(0).get(1).value()).isEqualTo(12.0);
        assertThat(result.hiddenGroups()).isEqualTo(1);
    }

    @Test
    void filteredGroupBelowFloorIsRefused() {
        AnalyticsSuppression.GuardResult guard =
                AnalyticsSuppression.guardFilteredGroupSize(4, 5);
        assertThat(guard.allowed()).isFalse();
        assertThat(guard.suppressed()).isTrue();
        assertThat(AnalyticsSuppression.guardFilteredGroupSize(5, 5).allowed()).isTrue();
    }

    @Test
    void goldenFixturesMirrorHandComputedValues() throws Exception {
        JsonNode golden = golden();
        JsonNode attendance = golden.path("rates").path(0);
        JsonNode suppression = golden.path("suppression");
        assertThat(attendance.path("id").asText()).isEqualTo("attendance.rate");
        assertThat(attendance.path("successes").asInt()).isEqualTo(1102);
        assertThat(attendance.path("trials").asInt()).isEqualTo(1180);
        // Hand-computed Wilson 95% bounds for 1102/1180 on the percent scale
        // (Acklam z=1.959963986, matching packages/analytics-core/src/stats.ts).
        assertThat(attendance.path("ciPercentLower").asDouble()).isEqualTo(91.827);
        assertThat(attendance.path("ciPercentUpper").asDouble()).isEqualTo(94.671);
        assertThat(suppression.path("threshold").asInt()).isEqualTo(5);
        assertThat(golden.path("wilson").isArray()).isTrue();
        assertThat(golden.path("normalQuantile").isArray()).isTrue();
    }

    private static JsonNode golden() throws Exception {
        try (InputStream in = AnalyticsPart8SuppressionTest.class
                .getResourceAsStream("/analytics/golden.json")) {
            assertThat(in).as("golden.json fixture must exist").isNotNull();
            return new ObjectMapper().readTree(in);
        }
    }

    @Test
    void wilsonIntervalMatchesTheHandComputedFixture() throws Exception {
        JsonNode golden = golden();
        JsonNode fixture = golden.path("wilson").path(0);
        double precision = Math.pow(10, -fixture.path("precision").asInt());
        var ci = AnalyticsStats.wilsonInterval(
                fixture.path("successes").asDouble(), fixture.path("trials").asDouble(), 0.95);
        assertThat(ci.lower()).isEqualTo(fixture.path("lower").asDouble(),
                org.assertj.core.data.Offset.offset(precision));
        assertThat(ci.upper()).isEqualTo(fixture.path("upper").asDouble(),
                org.assertj.core.data.Offset.offset(precision));
        assertThat(ci.method()).isEqualTo("wilson-95");

        JsonNode rate = golden.path("rates").path(0);
        double ratePrecision = Math.pow(10, -rate.path("precision").asInt());
        var result = AnalyticsStats.rateMetric(
                rate.path("successes").asDouble(), rate.path("trials").asDouble(), "present");
        assertThat(result.value()).isEqualTo(rate.path("value").asDouble(),
                org.assertj.core.data.Offset.offset(ratePrecision));
        assertThat(result.n()).isEqualTo(rate.path("n").asLong());
        assertThat(result.ci()).isNotNull();
        assertThat(result.ci().lower()).isEqualTo(rate.path("ciPercentLower").asDouble(),
                org.assertj.core.data.Offset.offset(ratePrecision));
        assertThat(result.ci().upper()).isEqualTo(rate.path("ciPercentUpper").asDouble(),
                org.assertj.core.data.Offset.offset(ratePrecision));
        assertThat(result.ci().method()).isEqualTo(rate.path("method").asText());
    }

    @Test
    void newAnalyticsIdsAreUuidV7Style() {
        UUID id = Uuids.newV7();
        assertThat(id.version()).isEqualTo(7);
        assertThat(id.variant()).isEqualTo(2);
        assertThat(Uuids.newV7()).isNotEqualTo(id);
    }

    @Test
    void invalidCountsAreRejectedRatherThanFabricated() {
        assertThatThrownBy(() -> AnalyticsStats.rateMetric(-1, 10, "present"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
