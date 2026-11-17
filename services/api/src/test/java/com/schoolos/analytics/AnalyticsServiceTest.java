package com.schoolos.analytics;

import com.schoolos.analytics.AnalyticsContract.DataPoint;
import com.schoolos.analytics.AnalyticsContract.Envelope;
import com.schoolos.analytics.AnalyticsFactSource.AttendanceRow;
import com.schoolos.analytics.AnalyticsFactSource.RefreshRow;
import com.schoolos.people.StudentAccessService;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/** Repository-free service tests: a fake fact source proves no database is needed. */
class AnalyticsServiceTest {

    private static final AnalyticsFilters NO_FILTERS =
            new AnalyticsFilters(null, null, null, null, null, null, null, null, null, null, null, null);

    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("director-1", "n", "ROLE_DIRECTOR"));
        PolicyService policy = new PolicyService();
        AnalyticsPolicyService policyService = new AnalyticsPolicyService(
                policy, new CurrentUser(), mock(StudentAccessService.class), (e, m, s) -> { }, "");
        service = new AnalyticsService(new FakeSource(false, List.of()), policyService);
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void noFactsYieldsEmptyDataAndExplicitSourceUnavailable() {
        Envelope<List<DataPoint>> response = service.series("attendance.rate", NO_FILTERS);
        assertThat(response.data()).isEmpty();
        assertThat(response.meta().sourceAvailable()).isFalse();
        assertThat(response.meta().mock()).isFalse();
        assertThat(response.meta().explain()).containsKey("reason");
        assertThat(response.meta().n()).isZero();
    }

    @Test
    void computesRateAndWilsonIntervalFromFacts() {
        List<AttendanceRow> rows = List.of(
                attendance(LocalDate.of(2026, 9, 1), 100, 90),
                attendance(LocalDate.of(2026, 9, 2), 100, 90));
        service = new AnalyticsService(new FakeSource(true, rows), policyService());

        Envelope<List<DataPoint>> response =
                service.series("attendance.rate", new AnalyticsFilters(
                        null, null, null, null, null, null, null, null, null, "day", null, null));

        assertThat(response.meta().sourceAvailable()).isTrue();
        assertThat(response.meta().n()).isEqualTo(200);
        assertThat(response.data()).hasSize(2);
        assertThat(response.data().get(0).value()).isEqualTo(90.0);
        assertThat(response.data().get(0).ci()).isNotNull();
        assertThat(response.data().get(0).ci().method()).isEqualTo("wilson-95");
        assertThat(response.meta().suppressedCells()).isFalse();
        assertThat(response.meta().lowSample()).isFalse();
    }

    @Test
    void suppressesSmallCellsBeforeSerialization() {
        List<AttendanceRow> rows = List.of(
                attendance(LocalDate.of(2026, 9, 1), 3, 2),
                attendance(LocalDate.of(2026, 9, 2), 2, 1),
                attendance(LocalDate.of(2026, 9, 3), 6, 5));
        service = new AnalyticsService(new FakeSource(true, rows), policyService());

        Envelope<List<DataPoint>> response =
                service.series("attendance.rate", new AnalyticsFilters(
                        null, null, null, null, null, null, null, null, null, "day", null, null));

        assertThat(response.meta().suppressedCells()).isTrue();
        assertThat(response.data()).hasSize(2);
        assertThat(response.data()).anySatisfy(p -> {
            assertThat(p.suppressed()).isTrue();
            assertThat(p.n()).isEqualTo(5);
            assertThat(p.label()).isEqualTo("__suppressed_other__");
        });
    }

    @Test
    void differencingGuardBlocksAFilteredGroupBelowThreshold() {
        service = new AnalyticsService(new FakeSource(true,
                List.of(attendance(LocalDate.of(2026, 9, 1), 3, 2))), policyService());

        Envelope<List<DataPoint>> response = service.series("attendance.rate", NO_FILTERS);

        assertThat(response.data()).isEmpty();
        assertThat(response.meta().suppressedCells()).isTrue();
        assertThat(response.meta().explain()).containsKey("reason");
    }

    @Test
    void emptyRefreshStateIsAlsoMarkedUnavailable() {
        Envelope<List<Map<String, Object>>> response = service.refreshState(NO_FILTERS);
        assertThat(response.data()).isEmpty();
        assertThat(response.meta().sourceAvailable()).isFalse();
    }

    private static AttendanceRow attendance(LocalDate date, long expected, long present) {
        return new AttendanceRow(null, date, 1, "T1", "2026", 2,
                expected, present, 0, 0, 0, 0, 0, 0);
    }

    private static AnalyticsPolicyService policyService() {
        return new AnalyticsPolicyService(new PolicyService(), new CurrentUser(),
                mock(StudentAccessService.class), (e, m, s) -> { }, "");
    }

    private static final class FakeSource implements AnalyticsFactSource {
        private final boolean hasFacts;
        private final List<AttendanceRow> attendance;

        private FakeSource(boolean hasFacts, List<AttendanceRow> attendance) {
            this.hasFacts = hasFacts;
            this.attendance = attendance;
        }

        @Override public boolean hasAnyFacts() { return hasFacts; }
        @Override public List<AttendanceRow> attendance(Set<java.util.UUID> allowed, AnalyticsFilters f) {
            return attendance;
        }
        @Override public List<AssessmentRow> assessment(Set<java.util.UUID> allowed, AnalyticsFilters f) {
            return List.of();
        }
        @Override public List<HomeworkRow> homework(Set<java.util.UUID> allowed, AnalyticsFilters f) {
            return List.of();
        }
        @Override public List<FinanceRow> finance(AnalyticsFilters f) { return List.of(); }
        @Override public List<RefreshRow> refreshStates() { return List.of(); }
    }
}
