package com.schoolos.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Allow/deny matrix for the EPIC 21 lesson permissions. */
@SpringBootTest
@ActiveProfiles("test")
class LessonPolicyTest {

    @Autowired PolicyService policy;
    @Autowired CurrentUser currentUser;

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void login(String role) {
        SecurityContextHolder.getContext().setAuthentication(
                new TestingAuthenticationToken("u", "n", "ROLE_" + role));
    }

    @Test
    void teachersCanReadAndWriteLessons() {
        login("TEACHER");
        assertThatCode(() -> policy.require(currentUser, PolicyService.LESSON_READ)).doesNotThrowAnyException();
        assertThatCode(() -> policy.require(currentUser, PolicyService.LESSON_WRITE)).doesNotThrowAnyException();
    }

    @Test
    void assistantsCanReadButNotWrite() {
        login("ASSISTANT");
        assertThatCode(() -> policy.require(currentUser, PolicyService.LESSON_READ)).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.LESSON_WRITE))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void guardiansHaveNoLessonAccess() {
        login("GUARDIAN");
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.LESSON_READ))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.require(currentUser, PolicyService.LESSON_WRITE))
                .isInstanceOf(AccessDeniedException.class);
    }
}
