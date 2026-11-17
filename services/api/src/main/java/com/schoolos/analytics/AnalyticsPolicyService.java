package com.schoolos.analytics;

import com.schoolos.people.StudentAccessService;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Turns a JWT role plus server-side membership into a concrete analytics row scope.
 * Deny by default; any filter that would widen a scoped role is rejected. Tenant isolation
 * is enforced by RLS underneath and never by a request parameter.
 */
@Service
public class AnalyticsPolicyService {

    public static final String EVENT_STUDENT_LEVEL = "STUDENT_LEVEL_ACCESS";
    public static final String EVENT_EXPORT = "EXPORT";

    private final PolicyService policy;
    private final CurrentUser currentUser;
    private final StudentAccessService studentAccessService;
    private final AnalyticsAuditSink audit;
    private final Set<UUID> teacherClassIds;

    public AnalyticsPolicyService(
            PolicyService policy,
            CurrentUser currentUser,
            StudentAccessService studentAccessService,
            AnalyticsAuditSink audit,
            @Value("${schoolos.analytics.teacher-class-ids:}") String teacherClassIds) {
        this.policy = policy;
        this.currentUser = currentUser;
        this.studentAccessService = studentAccessService;
        this.audit = audit;
        this.teacherClassIds = parseClassIds(teacherClassIds);
    }

    public AnalyticsScope resolve(AnalyticsFilters filters) {
        return resolve(filters, null);
    }

    /**
     * Resolve scope for one request. {@code metricId} is only used for the audit record;
     * it is never a tenant or row-scope source.
     */
    public AnalyticsScope resolve(AnalyticsFilters filters, String metricId) {
        // Defence in depth: the interceptor enforces the annotation, this re-checks the
        // matrix directly (and stays correct when the service is called from a job).
        policy.require(currentUser, PolicyService.ANALYTICS_READ);

        int threshold = resolveThreshold(filters.threshold());

        boolean analyst = currentUser.hasRole("DATA_ANALYST");
        boolean teacher = currentUser.hasRole("TEACHER");
        boolean guardian = currentUser.hasRole("GUARDIAN");
        boolean student = currentUser.hasRole("STUDENT");
        boolean director = currentUser.hasRole("DIRECTOR") || currentUser.hasRole("ADMIN")
                || currentUser.hasRole("OWNER") || currentUser.hasRole("PLATFORM_ADMIN");
        boolean groupAdmin = currentUser.hasRole("GROUP_ADMIN");
        boolean deputy = currentUser.hasRole("DEPUTY");
        boolean finance = currentUser.hasRole("FINANCE") || currentUser.hasRole("ACCOUNTANT");
        boolean auditor = currentUser.hasRole("AUDITOR");

        if (!(analyst || teacher || guardian || student || director || groupAdmin
                || deputy || finance || auditor)) {
            throw new AccessDeniedException("Analytics is not available for this role");
        }

        Set<UUID> allowedClasses = null;    // null = every class inside the JWT tenant
        Set<UUID> allowedStudents = null;   // null = every pseudonymous key inside the tenant
        boolean studentLevel = false;
        boolean audited = false;            // denied attempts are audited exactly once
        String scopeLabel;

        if (teacher) {
            allowedClasses = teacherClassIds; // empty set denies every class row by default
            studentLevel = policy.hasPermission(currentUser, PolicyService.ANALYTICS_STUDENT);
            if (studentLevel && (filters.studentKey() != null
                    || (filters.classId() != null && !allowedClasses.contains(filters.classId())))) {
                audit.record(EVENT_STUDENT_LEVEL, metricId, "own-classes");
                audited = true;
            }
            if (filters.classId() != null && !allowedClasses.contains(filters.classId())) {
                throw new AccessDeniedException("Class is outside the teacher's scope");
            }
            scopeLabel = "own-classes";
        } else if (guardian || student) {
            scopeLabel = guardian ? "own-children" : "self";
            studentLevel = policy.hasPermission(currentUser, PolicyService.ANALYTICS_STUDENT);
            if (studentLevel && (filters.classId() != null
                    || (filters.studentKey() != null
                        && !studentAccessService.visibleStudentIds().contains(filters.studentKey())))) {
                audit.record(EVENT_STUDENT_LEVEL, metricId, scopeLabel);
                audited = true;
            }
            if (filters.classId() != null) {
                throw new AccessDeniedException("Class filters are not available to this role");
            }
            allowedStudents = studentAccessService.visibleStudentIds();
            if (filters.studentKey() != null && !allowedStudents.contains(filters.studentKey())) {
                throw new AccessDeniedException("Student is outside the caller's scope");
            }
        } else if (analyst) {
            studentLevel = policy.hasPermission(currentUser, PolicyService.ANALYTICS_STUDENT);
            scopeLabel = "pseudonymous";
        } else if (groupAdmin) {
            scopeLabel = "group-normalised";
        } else if (finance) {
            scopeLabel = "finance";
        } else if (auditor) {
            scopeLabel = "read-only-aggregate";
        } else {
            scopeLabel = "school"; // director / school admin / deputy
        }

        if (!studentLevel && filters.studentKey() != null) {
            throw new AccessDeniedException("Student-level drilldown requires analytics.student");
        }

        // Audit every student-level access ATTEMPT, including a denied broadening attempt.
        if (studentLevel && !audited
                && (filters.studentKey() != null || analyst || guardian || student || teacher)) {
            audit.record(EVENT_STUDENT_LEVEL, metricId, scopeLabel);
        }

        return new AnalyticsScope(allowedClasses, allowedStudents, studentLevel, threshold);
    }

    /** Export is sensitive: step-up is enforced by PolicyService.require(). */
    public void requireExport() {
        policy.require(currentUser, PolicyService.ANALYTICS_EXPORT);
        audit.record(EVENT_EXPORT, null, "export");
    }

    private int resolveThreshold(Integer requested) {
        if (requested != null && !policy.hasPermission(currentUser, PolicyService.ANALYTICS_CONFIGURE)) {
            throw new AccessDeniedException("Only head/admin may configure the suppression threshold");
        }
        return AnalyticsSuppression.normalizeThreshold(requested);
    }

    private static Set<UUID> parseClassIds(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return UUID.fromString(s);
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.collectingAndThen(Collectors.toCollection(LinkedHashSet::new), Set::copyOf));
    }
}
