package com.schoolos.analytics;

import com.schoolos.people.StudentAccessService;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.StepUpRequiredException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Independent deny-by-default and role-scope checks for Part 8. Pure unit test: no Spring
 * context, no database. The audit sink is a mock so every student-level attempt is asserted.
 */
class AnalyticsPart8PolicyTest {

    private final PolicyService policy = new PolicyService();
    private final CurrentUser currentUser = new CurrentUser();
    private final StudentAccessService studentAccess = mock(StudentAccessService.class);
    private final AnalyticsAuditSink audit = mock(AnalyticsAuditSink.class);
    private final UUID classA = UUID.randomUUID();
    private final UUID classB = UUID.randomUUID();
    private final UUID child = UUID.randomUUID();

    private AnalyticsPolicyService service() {
        return new AnalyticsPolicyService(policy, currentUser, studentAccess, audit, classA.toString());
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void login(String... roles) {
        List<String> authorities = java.util.Arrays.stream(roles).map(r -> "ROLE_" + r).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("actor-1", "n", authorities.toArray(String[]::new)));
    }

    private void loginWithStepUp(String role) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("actor-1")
                .claim("roles", List.of(role))
                .claim("school_id", UUID.randomUUID().toString())
                .claim("step_up", Instant.now().plusSeconds(300).getEpochSecond())
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)), "actor-1"));
    }

    private static AnalyticsFilters filters(UUID classId, UUID studentKey, Integer threshold) {
        return new AnalyticsFilters(null, null, null, null, classId, studentKey,
                null, null, null, null, null, threshold);
    }

    @Test
    void unknownRoleIsDeniedByDefault() {
        login("SOMEBODY");
        assertThatThrownBy(() -> service().resolve(filters(null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
        verify(audit, never()).record(anyString(), anyString(), anyString());
    }

    @Test
    void teacherIsScopedToConfiguredClassesAndAuditsStudentLevelAccess() {
        login("TEACHER");
        AnalyticsPolicyService svc = service();

        AnalyticsScope scope = svc.resolve(filters(classA, null, null), "attendance.rate");
        assertThat(scope.allowedClassIds()).containsExactly(classA);
        assertThat(scope.studentLevel()).isTrue();

        assertThatThrownBy(() -> svc.resolve(filters(classB, null, null), "attendance.rate"))
                .isInstanceOf(AccessDeniedException.class);
        // The in-scope read and the denied broadening attempt are both audited.
        verify(audit, times(2))
                .record(AnalyticsPolicyService.EVENT_STUDENT_LEVEL, "attendance.rate", "own-classes");
    }

    @Test
    void guardianCannotReachAnotherChildOrAClassFilter() {
        login("GUARDIAN");
        when(studentAccess.visibleStudentIds()).thenReturn(Set.of(child));
        AnalyticsPolicyService svc = service();

        UUID otherChild = UUID.randomUUID();
        assertThatThrownBy(() -> svc.resolve(filters(null, otherChild, null), "marks.pass_rate"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> svc.resolve(filters(classA, null, null), "marks.pass_rate"))
                .isInstanceOf(AccessDeniedException.class);

        AnalyticsScope scope = svc.resolve(filters(null, child, null), "marks.pass_rate");
        assertThat(scope.allowedStudentKeys()).containsExactly(child);
        assertThat(scope.studentLevel()).isTrue();
        // Both denied broadening attempts and the successful child read are audited.
        verify(audit, times(3))
                .record(AnalyticsPolicyService.EVENT_STUDENT_LEVEL, "marks.pass_rate", "own-children");
    }

    @Test
    void studentScopeIsSelfOnly() {
        login("STUDENT");
        UUID self = UUID.randomUUID();
        when(studentAccess.visibleStudentIds()).thenReturn(Set.of(self));
        AnalyticsScope scope = service().resolve(filters(null, self, null), "attendance.rate");
        assertThat(scope.allowedStudentKeys()).containsExactly(self);
        verify(audit).record(AnalyticsPolicyService.EVENT_STUDENT_LEVEL, "attendance.rate", "self");
    }

    @Test
    void auditorIsAggregateReadOnlyAndCannotDrillToStudents() {
        login("AUDITOR");
        assertThatThrownBy(() -> service().resolve(filters(null, UUID.randomUUID(), null), "marks.pass_rate"))
                .isInstanceOf(AccessDeniedException.class);
        AnalyticsScope scope = service().resolve(filters(null, null, null), "marks.pass_rate");
        assertThat(scope.studentLevel()).isFalse();
    }

    @Test
    void headAndAdminCanChangeThresholdOnlyWithinThreeToTwenty() {
        login("DIRECTOR");
        AnalyticsScope raised = service().resolve(filters(null, null, 20), "attendance.rate");
        assertThat(raised.suppressionThreshold()).isEqualTo(20);
        AnalyticsScope clamped = service().resolve(filters(null, null, 999), "attendance.rate");
        assertThat(clamped.suppressionThreshold()).isEqualTo(20);
        assertThat(service().resolve(filters(null, null, 1), "attendance.rate").suppressionThreshold())
                .isEqualTo(3);
    }

    @Test
    void teacherCannotChangeSuppressionThreshold() {
        login("TEACHER");
        assertThatThrownBy(() -> service().resolve(filters(null, null, 7), "attendance.rate"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void exportRequiresFreshStepUpAndIsAudited() {
        login("DIRECTOR");
        assertThatThrownBy(() -> service().requireExport()).isInstanceOf(StepUpRequiredException.class);

        loginWithStepUp("DIRECTOR");
        assertThatCode(() -> service().requireExport()).doesNotThrowAnyException();
        verify(audit).record(AnalyticsPolicyService.EVENT_EXPORT, null, "export");
    }

    @Test
    void noRequestRoleCanWidenTenantScope() {
        // The filters record has no school_id field at all; scope is derived from JWT roles only.
        assertThat(java.util.Arrays.stream(AnalyticsFilters.class.getRecordComponents())
                .map(component -> component.getName())
                .toList()).doesNotContain("schoolId", "school_id");
        login("DIRECTOR");
        AnalyticsScope scope = service().resolve(filters(null, null, null), "finance.collection_rate");
        assertThat(scope.allowedClassIds()).isNull();
        assertThat(scope.allowedStudentKeys()).isNull();
        verify(audit, never()).record(eq(AnalyticsPolicyService.EVENT_STUDENT_LEVEL), anyString(), anyString());
    }
}
