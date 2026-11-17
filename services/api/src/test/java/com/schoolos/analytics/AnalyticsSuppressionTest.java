package com.schoolos.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

/** Small-cell suppression, merge/drop and differencing guard fixtures mirrored from TS. */
class AnalyticsSuppressionTest {

    private JsonNode golden;

    @BeforeEach
    void loadFixtures() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/analytics/golden.json")) {
            assertThat(in).isNotNull();
            golden = new ObjectMapper().readTree(in).path("suppression");
        }
    }

    private static List<AnalyticsSuppression.Cell> cells(JsonNode node) {
        List<AnalyticsSuppression.Cell> out = new ArrayList<>();
        for (JsonNode c : node) {
            JsonNode numerator = c.path("numerator");
            Double n = numerator.isNull() || numerator.isMissingNode() ? null : numerator.asDouble();
            out.add(AnalyticsSuppression.Cell.of(
                    c.path("key").asText(), c.path("label").asText(), c.path("n").asLong(),
                    c.path("value").asDouble(), n));
        }
        return out;
    }

    @Test
    void hidesSmallCellsAndMergesThemIntoAnOtherCell() {
        JsonNode fixture = golden.path("cells");
        JsonNode expected = golden.path("expected");
        int threshold = golden.path("threshold").asInt();
        AnalyticsSuppression.SuppressionResult result =
                AnalyticsSuppression.suppressCells(cells(fixture), threshold);

        assertThat(result.hiddenGroups()).isEqualTo(expected.path("hiddenGroups").asInt());
        assertThat(result.suppressedCells()).isTrue();
        assertThat(result.cells()).hasSize(expected.path("cellCount").asInt());
        AnalyticsSuppression.Cell other = result.cells().stream()
                .filter(AnalyticsSuppression.Cell::suppressed).findFirst().orElseThrow();
        assertThat(other.n()).isEqualTo(expected.path("otherN").asLong());
        assertThat(other.value()).isCloseTo(expected.path("otherValue").asDouble(), offset(1e-10));
        assertThat(other.label()).isEqualTo(AnalyticsSuppression.OTHER_LABEL);
    }

    @Test
    void dropsTheMergedCellWhenTheUnionIsStillBelowThreshold() {
        JsonNode drop = golden.path("dropCase");
        AnalyticsSuppression.SuppressionResult result =
                AnalyticsSuppression.suppressCells(cells(drop.path("cells")), golden.path("threshold").asInt());
        assertThat(result.cells()).isEmpty();
        assertThat(result.hiddenGroups()).isEqualTo(drop.path("expectedHiddenGroups").asInt());
        assertThat(result.suppressedCells()).isTrue();
    }

    @Test
    void differencingGuardRefusesFilteredGroupsBelowThreshold() {
        for (JsonNode fixture : golden.path("guard")) {
            AnalyticsSuppression.GuardResult result = AnalyticsSuppression.guardFilteredGroupSize(
                    fixture.path("filteredN").asLong(), fixture.path("threshold").asInt());
            assertThat(result.allowed()).isEqualTo(fixture.path("allowed").asBoolean());
            assertThat(result.suppressed()).isEqualTo(!fixture.path("allowed").asBoolean());
        }
    }

    @Test
    void thresholdDefaultsToFiveAndClampsToThreeThroughTwenty() {
        for (JsonNode fixture : golden.path("thresholdClamp")) {
            JsonNode input = fixture.path("input");
            Integer value = input.isNull() ? null : input.asInt();
            assertThat(AnalyticsSuppression.normalizeThreshold(value))
                    .isEqualTo(fixture.path("expected").asInt());
        }
    }
}
