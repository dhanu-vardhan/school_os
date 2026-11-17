package com.schoolos.analytics;

import com.schoolos.analytics.AnalyticsContract.DataPoint;
import com.schoolos.analytics.AnalyticsContract.Envelope;
import com.schoolos.analytics.AnalyticsContract.Meta;
import com.schoolos.analytics.AnalyticsContract.MetricDefinition;
import com.schoolos.analytics.AnalyticsExportService.ExportJob;
import com.schoolos.analytics.AnalyticsExportService.JobStatus;
import com.schoolos.analytics.AnalyticsSavedViewService.SavedViewDto;
import com.schoolos.analytics.AnalyticsSavedViewService.SavedViewRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.StepUpRequiredException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pure unit coverage for the governed Part 8 API facade, async exports and saved views. */
class AnalyticsPart8ApiTest {

    private static final UUID SCHOOL = UUID.randomUUID();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static AnalyticsFilters noFilters() {
        return new AnalyticsFilters(null, null, null, null, null, null,
                null, null, null, null, null, null);
    }

    private static void login(boolean stepUp) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("actor-1")
                .claim("roles", List.of("DIRECTOR"))
                .claim("school_id", SCHOOL.toString());
        if (stepUp) {
            builder.claim("step_up", Instant.now().plusSeconds(300).getEpochSecond());
        }
        Jwt jwt = builder.build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("ROLE_DIRECTOR")), "actor-1"));
    }

    @Test
    void dictionaryPublishesGovernedDefinitionsWithoutData() {
        AnalyticsService service = new AnalyticsService(
                mock(AnalyticsFactSource.class), mock(AnalyticsPolicyService.class));

        List<MetricDefinition> dictionary = service.dictionary();

        assertThat(dictionary).extracting(MetricDefinition::id)
                .contains("attendance.rate", "marks.pass_rate", "finance.collection_rate");
        assertThat(dictionary).allSatisfy(m -> {
            assertThat(m.formula()).isNotBlank();
            assertThat(m.nMin()).isPositive();
        });
        assertThat(dictionary).filteredOn(MetricDefinition::association)
                .allSatisfy(m -> assertThat(m.caveat()).contains("association"));
    }

    @Test
    void exportRequiresFreshStepUpAndExplicitWatermarkConfirmation() {
        login(false);
        AnalyticsService delegate = mock(AnalyticsService.class);
        AnalyticsExportService exports = new AnalyticsExportService(
                delegate, new PolicyService(), new CurrentUser(), new SyncTaskExecutor());

        assertThatThrownBy(() -> exports.start(
                new AsyncExportRequest("csv", List.of("attendance.rate"), "k", true), noFilters()))
                .isInstanceOf(StepUpRequiredException.class);

        login(true);
        when(delegate.dictionary()).thenReturn(List.of(new MetricDefinition(
                "attendance.rate", "formula", 20, false, false, null)));
        assertThatThrownBy(() -> exports.start(
                new AsyncExportRequest("csv", List.of("attendance.rate"), "k", false), noFilters()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void asyncExportCompletesWithWatermarkAndReusesIdempotencyKey() {
        login(true);
        AnalyticsService delegate = mock(AnalyticsService.class);
        when(delegate.dictionary()).thenReturn(List.of(new MetricDefinition(
                "attendance.rate", "formula", 20, false, false, null)));
        when(delegate.export(any(ExportRequest.class), any()))
                .thenReturn(new Envelope<>("metric,label\n", Meta.empty(5)));
        AnalyticsExportService exports = new AnalyticsExportService(
                delegate, new PolicyService(), new CurrentUser(), new SyncTaskExecutor());
        AsyncExportRequest request = new AsyncExportRequest(
                "csv", List.of("attendance.rate"), "retry-1", true);

        ExportJob first = exports.start(request, noFilters());
        ExportJob retry = exports.start(request, noFilters());

        assertThat(first.id()).isNotNull();
        assertThat(retry.id()).isEqualTo(first.id());
        ExportJob done = exports.status(first.id());
        assertThat(done.status()).isEqualTo(JobStatus.COMPLETED);
        assertThat(done.watermark()).contains("Confidential").contains("SchoolOS");
        assertThat(done.content()).contains("metric,label");
        assertThat(done.error()).isNull();
    }

    @Test
    void savedViewsAreOwnedAndScopedToTheJwtTenant() throws Exception {
        login(false);
        AnalyticsSavedViewRepository repository = mock(AnalyticsSavedViewRepository.class);
        CurrentUser currentUser = new CurrentUser();
        AnalyticsSavedViewService service =
                new AnalyticsSavedViewService(repository, currentUser, new ObjectMapper());
        when(repository.findBySchoolIdAndOwnerSubAndName(SCHOOL, "actor-1", "Main"))
                .thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        SavedViewDto saved = service.save(
                new SavedViewRequest("Main", "principal", Map.of("grain", "month")));

        assertThat(saved.name()).isEqualTo("Main");
        assertThat(saved.filters()).containsEntry("grain", "month");
        verify(repository).save(argThat(entity ->
                SCHOOL.equals(entity.getSchoolId()) && "actor-1".equals(entity.getOwnerSub())));

        AnalyticsSavedView foreign = new AnalyticsSavedView();
        foreign.setId(UUID.randomUUID());
        foreign.setSchoolId(SCHOOL);
        foreign.setOwnerSub("someone-else");
        when(repository.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        assertThatThrownBy(() -> service.delete(foreign.getId()))
                .isInstanceOf(AccessDeniedException.class);
        verify(repository, never()).delete(any());
    }

    @Test
    void facadeRoutesDelegatesAndStudentDrilldownRequiresPermission() {
        login(true);
        AnalyticsService service = mock(AnalyticsService.class);
        AnalyticsExportService exports = mock(AnalyticsExportService.class);
        AnalyticsSavedViewService views = mock(AnalyticsSavedViewService.class);
        AnalyticsApiController controller = new AnalyticsApiController(
                service, exports, views, new PolicyService(), new CurrentUser());
        Envelope<List<DataPoint>> empty = new Envelope<>(List.of(), Meta.empty(5));
        when(service.overview(any())).thenReturn(empty);
        when(service.series(anyString(), any())).thenReturn(empty);
        when(service.dictionary()).thenReturn(List.of());

        Envelope<List<MetricDefinition>> dictionary = controller.dictionary();
        assertThat(dictionary.data()).isEmpty();
        assertThat(dictionary.meta().sourceAvailable()).isTrue();

        assertThat((List<?>) controller.dashboard(new MockHttpServletRequest()).data()).isEmpty();
        verify(service).overview(any());

        UUID student = UUID.randomUUID();
        controller.student(student.toString(), "attendance.rate", new MockHttpServletRequest());
        verify(service).series(eq("attendance.rate"),
                argThat(f -> student.equals(f.studentKey())));
    }
}
