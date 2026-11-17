package com.schoolos.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Central permission matrix. See docs/AUTH_DESIGN.md §3 (the two must stay in sync).
 * A missing role or permission is denied: there is no implicit allow.
 */
@Service
public class PolicyService {

    public static final String SCHOOL_READ = "school.read";
    public static final String SCHOOL_SETTINGS = "school.settings";
    public static final String MEMBERS_MANAGE = "members.manage";
    public static final String ROLE_MANAGE = "role.manage";
    public static final String CLASS_READ = "class.read";
    public static final String CLASS_CREATE = "class.create";
    public static final String CLASS_UPDATE = "class.update";
    public static final String CLASS_MOVE_STUDENT = "class.move_student";
    public static final String STUDENT_READ = "student.read";
    public static final String STUDENT_WRITE = "student.write";
    public static final String DASHBOARD_READ = "dashboard.read";
    public static final String ATTENDANCE_READ = "attendance.read";
    public static final String ATTENDANCE_WRITE = "attendance.write";
    public static final String OBSERVATION_CREATE = "observation.create";
    public static final String ANNOUNCEMENT_CREATE = "announcement.create";
    public static final String MESSAGE_READ = "message.read";
    public static final String MESSAGE_WRITE = "message.write";
    public static final String ABSENCE_CREATE = "absence.create";
    public static final String BILLING_READ = "billing.read";
    public static final String BILLING_MANAGE = "billing.manage";
    public static final String ACTIVITY_READ = "activity.read";
    public static final String ACTIVITY_MANAGE = "activity.manage";
    public static final String SAFEGUARDING_READ = "safeguarding.read";
    public static final String SAFEGUARDING_WRITE = "safeguarding.write";
    public static final String HEALTH_READ = "health.read";
    public static final String HEALTH_WRITE = "health.write";
    public static final String HR_READ = "hr.read";
    public static final String HR_WRITE = "hr.write";
    public static final String IT_MANAGE = "it.manage";
    public static final String LIBRARY_READ = "library.read";
    public static final String LIBRARY_WRITE = "library.write";
    public static final String RECEPTION_READ = "reception.read";
    public static final String RECEPTION_WRITE = "reception.write";
    public static final String AUDIT_READ = "audit.read";
    public static final String SECURITY_READ = "security.read";
    public static final String EXPORT = "export";
    public static final String ERASURE = "erasure";
    public static final String MFA_MANAGE = "mfa.manage";
    public static final String IMPERSONATE = "impersonate";
    public static final String OPERATOR_ACCESS = "operator.access";
    public static final String PLATFORM_ADMIN = "platform.admin";
    public static final String LESSON_READ = "lesson.read";
    public static final String LESSON_WRITE = "lesson.write";

    private static final Set<String> SCHOOL_READER = Set.of(
            SCHOOL_READ, STUDENT_READ, DASHBOARD_READ, ATTENDANCE_READ, MESSAGE_READ,
            ACTIVITY_READ, CLASS_READ);

    private static final Set<String> SENSITIVE = Set.of(
            SAFEGUARDING_READ, SAFEGUARDING_WRITE, HEALTH_READ, HEALTH_WRITE,
            BILLING_MANAGE, EXPORT, ERASURE, ROLE_MANAGE, MFA_MANAGE, IMPERSONATE);

    private static final Set<String> ALL = Set.of(
            SCHOOL_READ, SCHOOL_SETTINGS, MEMBERS_MANAGE, ROLE_MANAGE, CLASS_READ,
            CLASS_CREATE, CLASS_UPDATE, CLASS_MOVE_STUDENT, STUDENT_READ, STUDENT_WRITE,
            DASHBOARD_READ, ATTENDANCE_READ, ATTENDANCE_WRITE, OBSERVATION_CREATE,
            ANNOUNCEMENT_CREATE, MESSAGE_READ, MESSAGE_WRITE, ABSENCE_CREATE, BILLING_READ,
            BILLING_MANAGE, ACTIVITY_READ, ACTIVITY_MANAGE, SAFEGUARDING_READ,
            SAFEGUARDING_WRITE, HEALTH_READ, HEALTH_WRITE, HR_READ, HR_WRITE, IT_MANAGE,
            LIBRARY_READ, LIBRARY_WRITE, RECEPTION_READ, RECEPTION_WRITE, AUDIT_READ,
            SECURITY_READ, EXPORT, ERASURE, MFA_MANAGE, IMPERSONATE, OPERATOR_ACCESS,
            PLATFORM_ADMIN, LESSON_READ, LESSON_WRITE);

    private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.ofEntries(
            Map.entry("PLATFORM_ADMIN", ALL),
            Map.entry("OWNER", ALL),
            Map.entry("GROUP_ADMIN", union(SCHOOL_READER, Set.of(
                    SCHOOL_SETTINGS, MEMBERS_MANAGE, CLASS_CREATE, CLASS_UPDATE,
                    ACTIVITY_MANAGE, BILLING_READ, HR_READ, AUDIT_READ, SECURITY_READ, EXPORT,
                    LESSON_READ))),
            Map.entry("DIRECTOR", union(SCHOOL_READER, Set.of(
                    SCHOOL_SETTINGS, MEMBERS_MANAGE, ROLE_MANAGE, CLASS_CREATE, CLASS_UPDATE,
                    CLASS_MOVE_STUDENT, STUDENT_WRITE, ATTENDANCE_WRITE, OBSERVATION_CREATE,
                    ANNOUNCEMENT_CREATE, MESSAGE_WRITE, BILLING_READ, BILLING_MANAGE,
                    ACTIVITY_MANAGE, SAFEGUARDING_READ, HEALTH_READ, HR_READ, HR_WRITE,
                    AUDIT_READ, SECURITY_READ, EXPORT, MFA_MANAGE, LESSON_READ, LESSON_WRITE))),
            Map.entry("ADMIN", union(SCHOOL_READER, Set.of(
                    SCHOOL_SETTINGS, MEMBERS_MANAGE, ROLE_MANAGE, CLASS_CREATE, CLASS_UPDATE,
                    CLASS_MOVE_STUDENT, STUDENT_WRITE, ATTENDANCE_WRITE, OBSERVATION_CREATE,
                    ANNOUNCEMENT_CREATE, MESSAGE_WRITE, BILLING_READ, BILLING_MANAGE,
                    ACTIVITY_MANAGE, SAFEGUARDING_READ, HR_READ, AUDIT_READ, SECURITY_READ,
                    EXPORT, MFA_MANAGE, LESSON_READ, LESSON_WRITE))),
            Map.entry("DEPUTY", union(SCHOOL_READER, Set.of(
                    CLASS_UPDATE, CLASS_MOVE_STUDENT, STUDENT_WRITE, ATTENDANCE_WRITE,
                    OBSERVATION_CREATE, ANNOUNCEMENT_CREATE, MESSAGE_WRITE, ABSENCE_CREATE,
                    ACTIVITY_MANAGE, BILLING_READ, LESSON_READ, LESSON_WRITE))),
            Map.entry("TEACHER", union(SCHOOL_READER, Set.of(
                    ATTENDANCE_WRITE, OBSERVATION_CREATE, MESSAGE_WRITE, ANNOUNCEMENT_CREATE,
                    LESSON_READ, LESSON_WRITE))),
            Map.entry("ASSISTANT", union(SCHOOL_READER, Set.of(
                    ATTENDANCE_WRITE, MESSAGE_WRITE, LESSON_READ))),
            Map.entry("SAFEGUARDING", union(SCHOOL_READER, Set.of(
                    SAFEGUARDING_READ, SAFEGUARDING_WRITE, HEALTH_READ, MESSAGE_WRITE,
                    ANNOUNCEMENT_CREATE, EXPORT, LESSON_READ))),
            Map.entry("NURSE", union(SCHOOL_READER, Set.of(
                    HEALTH_READ, HEALTH_WRITE, SAFEGUARDING_READ, MESSAGE_WRITE))),
            Map.entry("FINANCE", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, BILLING_READ,
                    BILLING_MANAGE, ACTIVITY_READ, MESSAGE_READ, EXPORT, AUDIT_READ)),
            Map.entry("ACCOUNTANT", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, BILLING_READ,
                    BILLING_MANAGE, EXPORT, AUDIT_READ)),
            Map.entry("HR", Set.of(DASHBOARD_READ, SCHOOL_READ, HR_READ, HR_WRITE, MEMBERS_MANAGE,
                    ROLE_MANAGE, EXPORT, AUDIT_READ, MESSAGE_READ)),
            Map.entry("IT_ADMIN", Set.of(DASHBOARD_READ, SCHOOL_READ, SECURITY_READ, IT_MANAGE,
                    MEMBERS_MANAGE, ROLE_MANAGE, AUDIT_READ, MESSAGE_READ)),
            Map.entry("LIBRARIAN", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, LIBRARY_READ,
                    LIBRARY_WRITE, MESSAGE_READ)),
            Map.entry("RECEPTION", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ,
                    RECEPTION_READ, RECEPTION_WRITE, MESSAGE_READ, MESSAGE_WRITE, ACTIVITY_READ)),
            Map.entry("AUDITOR", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, AUDIT_READ,
                    SECURITY_READ, EXPORT)),
            Map.entry("GUARDIAN", Set.of(DASHBOARD_READ, STUDENT_READ, ATTENDANCE_READ,
                    ABSENCE_CREATE, MESSAGE_READ, MESSAGE_WRITE, ACTIVITY_READ, BILLING_READ)),
            Map.entry("STUDENT", Set.of(DASHBOARD_READ, STUDENT_READ, ATTENDANCE_READ,
                    MESSAGE_READ, ACTIVITY_READ)),
            Map.entry("ADMISSIONS", Set.of(DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, STUDENT_WRITE,
                    MESSAGE_READ, MESSAGE_WRITE, ACTIVITY_READ)),
            Map.entry("INSTRUCTOR", Set.of(ACTIVITY_READ, ATTENDANCE_READ, ATTENDANCE_WRITE,
                    MESSAGE_READ, LESSON_READ)),
            Map.entry("PROVIDER", Set.of(ACTIVITY_READ, BILLING_READ, MESSAGE_READ)),
            Map.entry("THERAPIST", Set.of(DASHBOARD_READ, STUDENT_READ, SAFEGUARDING_READ,
                    HEALTH_READ, MESSAGE_READ)),
            Map.entry("OPERATOR", Set.of(OPERATOR_ACCESS, PLATFORM_ADMIN, SECURITY_READ, AUDIT_READ))
    );

    private static Set<String> union(Set<String> a, Set<String> b) {
        Set<String> out = new HashSet<>(a);
        out.addAll(b);
        return Set.copyOf(out);
    }

    public Set<String> permissionsFor(String role) {
        if (role == null) return Set.of();
        return ROLE_PERMISSIONS.getOrDefault(role.trim().toUpperCase().replace("ROLE_", ""), Set.of());
    }

    public boolean hasPermission(CurrentUser user, String permission) {
        return user.roles().stream()
                .anyMatch(role -> permissionsFor(role).contains(permission));
    }

    public void require(CurrentUser user, String permission) {
        if (!hasPermission(user, permission)) {
            throw new AccessDeniedException("Missing permission: " + permission);
        }
        if (SENSITIVE.contains(permission) && !user.stepUpActive()) {
            throw new StepUpRequiredException();
        }
    }

    /** Explicit second line of defence; RLS remains the authoritative tenant boundary. */
    public void requireSameSchool(CurrentUser user, UUID targetSchoolId) {
        if (targetSchoolId != null && !targetSchoolId.equals(user.schoolId())) {
            throw new AccessDeniedException("Cross-tenant access denied");
        }
    }

    public static boolean isSensitive(String permission) {
        return SENSITIVE.contains(permission);
    }
}
