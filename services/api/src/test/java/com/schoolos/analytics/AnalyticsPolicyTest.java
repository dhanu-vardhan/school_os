package com.schoolos.analytics;

import com.schoolos.people.StudentAccessService;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.StepUpRequiredException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Deny-by-default, role scoping, threshold configuration and export step-up. */
class AnalyticsPolicyTest {

    private static final UUID SCHOOL = UUID.randomUUID();
    private static final UUID TEACHER_CLASS = UUID.randomUUID();
    private static final UUID OTHER_CLASS = UUID.randomUUID();
    private static final UUID CHILD = UUID.randomUUID();
    private static final UUID OTHER_CHILD = UUID.randomUUID();

    private final PolicyService policy = new PolicyService();
    private final CurrentUser currentUser = new CurrentUser();
    private StudentAccessService studentAccess;
    private List<String> audits;
    private AnalyticsPolicyService service;

    @BeforeEach
    void setUp() {
        studentAccess = mock(StudentAccessService.class);
        when(studentAccess.visibleStudentIds()).thenReturn(Set.of(CHILD));
        audits = new ArrayList<>();
        AnalyticsAuditSink sink = (event, metric, scope) -> audits.add(event + "|" + metric + "|" + scope);
        service = new AnalyticsPolicyService(policy, currentUser, studentAccess, sink,
                TEACHER_CLASS.toString());
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("user-1", "n", "ROLE_" + role));
    }

    private static void loginWithStepUp(String role) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("user-1")
                .claim("roles", List.of(role))
                .claim("school_id", SCHOOL.toString())
                .claim("step_up", Instant.now().plusSeconds(300).getEpochSecond())
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)), "user-1"));
    }

    private static AnalyticsFilters filters(UUID classId, UUID studentKey, Integer threshold) {
        return new AnalyticsFilters(null, null, null, null, classId, studentKey,
                null, null, null, null, null, threshold);
    }

    @Test
    void unknownRoleIsDeniedByDefault() {
        login("SOMEBODY");
        assertThatThrownBy(() -> service.resolve(filters(null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(policy.permissionsFor("SOMEBODY")).isEmpty();
    }

    @Test
    void roleWithoutAnalyticsReadIsDeniedEvenIfItHasOtherReads() {
        login("LIBRARIAN");
        assertThatThrownBy(() -> service.resolve(filters(null, null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void teacherScopeNarrowsToOwnClassesAndRefusesBroaderFilters() {
        login("TEACHER");
        AnalyticsScope inScope = service.resolve(filters(TEACHER_CLASS, null, null));
        assertThat(inScope.allowedClassIds()).containsExactly(TEACHER_CLASS);
        assertThat(inScope.studentLevel()).isTrue();
        assertThatThrownBy(() -> service.resolve(filters(OTHER_CLASS, null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void teacherCannotConfigureTheSuppressionThreshold() {
        login("TEACHER");
        assertThatThrownBy(() -> service.resolve(filters(null, null, 12)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(service.resolve(filters(null, null, null)).suppressionThreshold()).isEqualTo(5);
    }

    @Test
    void directorCanConfigureThresholdButItIsClamped() {
        login("DIRECTOR");
        assertThat(service.resolve(filters(null, null, 99)).suppressionThreshold()).isEqualTo(20);
        assertThat(service.resolve(filters(null, null, 1)).suppressionThreshold()).isEqualTo(3);
    }

    @Test
    void guardianIsLimitedToLinkedChildrenAndEveryStudentAccessIsAudited() {
        login("GUARDIAN");
        AnalyticsScope scope = service.resolve(filters(null, CHILD, null), "attendance.rate");
        assertThat(scope.allowedStudentKeys()).containsExactly(CHILD);
        assertThat(audits).hasSize(1);
        assertThat(audits.get(0)).contains("STUDENT_LEVEL_ACCESS").contains("attendance.rate").contains("own-children");

        audits.clear();
        assertThatThrownBy(() -> service.resolve(filters(null, OTHER_CHILD, null), "attendance.rate"))
                .isInstanceOf(AccessDeniedException.class);
        // Denied broadening attempts are audited too.
        assertThat(audits).hasSize(1);
        assertThatThrownBy(() -> service.resolve(filters(TEACHER_CLASS, null, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void studentIsLimitedToSelf() {
        when(studentAccess.visibleStudentIds()).thenReturn(Set.of(CHILD));
        login("STUDENT");
        AnalyticsScope scope = service.resolve(filters(null, CHILD, null));
        assertThat(scope.allowedStudentKeys()).containsExactly(CHILD);
        assertThat(audits.get(0)).contains("self");
        assertThatThrownBy(() -> service.resolve(filters(null, OTHER_CHILD, null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aggregateOnlyRolesCannotDrillIntoStudents() {
        login("FINANCE");
        assertThatCode(() -> service.resolve(filters(null, null, null))).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.resolve(filters(null, CHILD, null)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(audits).isEmpty();
    }

    @Test
    void exportIsSensitiveAndRequiresStepUp() {
        login("DIRECTOR");
        assertThatThrownBy(service::requireExport).isInstanceOf(StepUpRequiredException.class);
        loginWithStepUp("DIRECTOR");
        assertThatCode(service::requireExport).doesNotThrowAnyException();
        assertThat(audits).anySatisfy(a -> assertThat(a).contains("EXPORT"));
    }

    @Test
    void dataAnalystHasPseudonymisedStudentAccessButNoConfigure() {
        login("DATA_ANALYST");
        assertThat(policy.hasPermission(currentUser, PolicyService.ANALYTICS_READ)).isTrue();
        assertThat(policy.hasPermission(currentUser, PolicyService.ANALYTICS_STUDENT)).isTrue();
        assertThat(policy.hasPermission(currentUser, PolicyService.ANALYTICS_EXPORT)).isTrue();
        assertThat(policy.hasPermission(currentUser, PolicyService.ANALYTICS_CONFIGURE)).isFalse();
        AnalyticsScope scope = service.resolve(filters(null, null, null), "combined.risk_composite");
        assertThat(scope.studentLevel()).isTrue();
        assertThat(scope.allowedClassIds()).isNull();
        assertThat(scope.allowedStudentKeys()).isNull();
        assertThat(audits.get(0)).contains("pseudonymous");
    }

    @Test
    void schoolIdNeverComesFromRequestFilters() {
        login("DIRECTOR");
        // The filter DTO has no school field at all: tenant scope is JWT-only (AGENTS.md rule 1).
        assertThat(java.util.Arrays.stream(AnalyticsFilters.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)
                .map(String::toLowerCase))
                .noneMatch(name -> name.contains("school"));
        assertThat(service.resolve(filters(null, null, null)).suppressionThreshold()).isEqualTo(5);
    }
}
