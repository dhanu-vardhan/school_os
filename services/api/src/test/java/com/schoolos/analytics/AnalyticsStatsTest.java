package com.schoolos.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.data.Offset.offset;

/** Verifies the Java mirror against the hand-computed TypeScript golden fixtures. */
class AnalyticsStatsTest {

    private JsonNode golden;

    @BeforeEach
    void loadFixtures() throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/analytics/golden.json")) {
            assertThat(in).as("golden.json fixture").isNotNull();
            golden = new ObjectMapper().readTree(in);
        }
    }

    @Test
    void wilsonIntervalMatchesGoldenFixtures() {
        for (JsonNode fixture : golden.path("wilson")) {
            double successes = fixture.path("successes").asDouble();
            double trials = fixture.path("trials").asDouble();
            double delta = Math.pow(10, -fixture.path("precision").asInt());
            AnalyticsContract.Ci ci = AnalyticsStats.wilsonInterval(successes, trials, 0.95);
            assertThat(ci.method()).isEqualTo(fixture.path("method").asText());
            assertThat(ci.lower()).isCloseTo(fixture.path("lower").asDouble(), offset(delta));
            assertThat(ci.upper()).isCloseTo(fixture.path("upper").asDouble(), offset(delta));
        }
    }

    @Test
    void normalQuantileMatchesGoldenFixture() {
        JsonNode fixture = golden.path("normalQuantile").get(0);
        double delta = Math.pow(10, -fixture.path("precision").asInt());
        assertThat(AnalyticsStats.normalQuantile(fixture.path("p").asDouble()))
                .isCloseTo(fixture.path("value").asDouble(), offset(delta));
    }

    @Test
    void rateMetricMatchesGoldenFixtures() {
        for (JsonNode fixture : golden.path("rates")) {
            double successes = fixture.path("successes").asDouble();
            double trials = fixture.path("trials").asDouble();
            double delta = Math.pow(10, -fixture.path("precision").asInt());
            AnalyticsStats.Result result = AnalyticsStats.rateMetric(successes, trials, "numerator");
            assertThat(result.value()).as(fixture.path("id").asText())
                    .isCloseTo(fixture.path("value").asDouble(), offset(delta));
            assertThat(result.n()).isEqualTo(fixture.path("n").asLong());
            assertThat(result.ci()).isNotNull();
            assertThat(result.ci().method()).isEqualTo(fixture.path("method").asText());
            assertThat(result.explain()).containsEntry("numerator", successes);
            assertThat(result.explain()).containsEntry("expected", trials);
        }
    }

    @Test
    void zeroTrialsReturnsNoIntervalRatherThanFabricatingOne() {
        AnalyticsStats.Result result = AnalyticsStats.rateMetric(0, 0, "present");
        assertThat(result.value()).isZero();
        assertThat(result.n()).isZero();
        assertThat(result.ci()).isNull();
    }
}
