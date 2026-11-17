package com.schoolos.security;

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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Allow/deny matrix, deny-by-default and the step-up gate for sensitive permissions. */
class RoleMatrixTest {

    private final PolicyService policy = new PolicyService();
    private final CurrentUser currentUser = new CurrentUser();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("user-1", "n", "ROLE_" + role));
    }

    private void loginWithStepUp(String role) {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "HS256")
                .subject("user-1")
                .claim("roles", List.of(role))
                .claim("school_id", UUID.randomUUID().toString())
                .claim("step_up", Instant.now().plusSeconds(300).getEpochSecond())
                .build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(
                jwt, List.of(new SimpleGrantedAuthority("ROLE_" + role)), "user-1"));
    }

    @Test
    void teacherCanReadStudentsButNotManageBilling() {
        login("TEACHER");
        assertThatCode(() -> policy.require(currentUser, PolicyService.STUDENT_READ)).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.BILLING_MANAGE))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void guardianCannotWriteStudentsOrReadSafeguarding() {
        login("GUARDIAN");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.STUDENT_WRITE))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.SAFEGUARDING_READ))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void financeCanManageBillingButNotSafeguarding() {
        login("FINANCE");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.BILLING_MANAGE))
                .isInstanceOf(StepUpRequiredException.class);
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.SAFEGUARDING_READ))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void sensitivePermissionsRequireStepUpEvenForTheDirector() {
        login("DIRECTOR");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.SAFEGUARDING_READ))
                .isInstanceOf(StepUpRequiredException.class);
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.EXPORT))
                .isInstanceOf(StepUpRequiredException.class);
    }

    @Test
    void aFreshStepUpUnlocksSensitivePermissions() {
        loginWithStepUp("DIRECTOR");
        assertThatCode(() -> policy.require(currentUser, PolicyService.SAFEGUARDING_READ)).doesNotThrowAnyException();
        assertThatCode(() -> policy.require(currentUser, PolicyService.EXPORT)).doesNotThrowAnyException();
    }

    @Test
    void unknownRolesAreDeniedEverything() {
        assertThat(policy.permissionsFor("SOMEBODY")).isEmpty();
        assertThat(policy.permissionsFor(null)).isEmpty();
        login("SOMEBODY");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.DASHBOARD_READ))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void anAuditorIsReadOnly() {
        login("AUDITOR");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.STUDENT_WRITE))
                .isInstanceOf(AccessDeniedException.class);
        assertThatCode(() -> policy.require(currentUser, PolicyService.AUDIT_READ)).doesNotThrowAnyException();
    }
}
