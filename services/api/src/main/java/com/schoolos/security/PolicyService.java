package com.schoolos.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Central permission matrix. See docs/PERMISSIONS.md (the two must stay in sync). */
@Service
public class PolicyService {

    public static final String CLASS_READ = "class.read";
    public static final String CLASS_CREATE = "class.create";
    public static final String CLASS_UPDATE = "class.update";
    public static final String CLASS_MOVE_STUDENT = "class.move_student";
    public static final String STUDENT_READ = "student.read";
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
    public static final String OPERATOR_ACCESS = "operator.access";

    private static final Set<String> SCHOOL_READER = Set.of(
            CLASS_READ, STUDENT_READ, DASHBOARD_READ, ATTENDANCE_READ, MESSAGE_READ, ACTIVITY_READ);

    private static final Map<String, Set<String>> ROLE_PERMISSIONS = Map.ofEntries(
            Map.entry("DIRECTOR", union(SCHOOL_READER, Set.of(CLASS_CREATE, CLASS_UPDATE, CLASS_MOVE_STUDENT,
                    ATTENDANCE_WRITE, OBSERVATION_CREATE, ANNOUNCEMENT_CREATE, MESSAGE_WRITE,
                    BILLING_READ, BILLING_MANAGE, ACTIVITY_MANAGE, SAFEGUARDING_READ))),
            Map.entry("DEPUTY", union(SCHOOL_READER, Set.of(CLASS_CREATE, CLASS_UPDATE, CLASS_MOVE_STUDENT,
                    ATTENDANCE_WRITE, OBSERVATION_CREATE, ANNOUNCEMENT_CREATE, MESSAGE_WRITE,
                    BILLING_READ, ACTIVITY_MANAGE))),
            Map.entry("TEACHER", union(SCHOOL_READER, Set.of(ATTENDANCE_WRITE, OBSERVATION_CREATE, MESSAGE_WRITE,
                    ANNOUNCEMENT_CREATE))),
            Map.entry("ASSISTANT", union(SCHOOL_READER, Set.of(ATTENDANCE_WRITE, MESSAGE_WRITE))),
            Map.entry("FINANCE", Set.of(DASHBOARD_READ, STUDENT_READ, BILLING_READ, BILLING_MANAGE, ACTIVITY_READ)),
            Map.entry("ADMISSIONS", Set.of(STUDENT_READ, DASHBOARD_READ)),
            Map.entry("RECEPTION", Set.of(STUDENT_READ, DASHBOARD_READ, MESSAGE_READ)),
            Map.entry("GUARDIAN", Set.of(MESSAGE_READ, MESSAGE_WRITE, ABSENCE_CREATE, ACTIVITY_READ, BILLING_READ)),
            Map.entry("INSTRUCTOR", Set.of(ACTIVITY_READ, ATTENDANCE_READ, ATTENDANCE_WRITE, MESSAGE_READ)),
            Map.entry("PROVIDER", Set.of(ACTIVITY_READ, BILLING_READ, MESSAGE_READ)),
            Map.entry("SAFEGUARDING", Set.of(STUDENT_READ, SAFEGUARDING_READ, MESSAGE_READ)),
            Map.entry("OPERATOR", Set.of(OPERATOR_ACCESS))
    );

    private static Set<String> union(Set<String> a, Set<String> b) {
        java.util.Set<String> out = new java.util.HashSet<>(a);
        out.addAll(b);
        return Set.copyOf(out);
    }

    public void require(CurrentUser user, String permission) {
        boolean allowed = user.roles().stream()
                .anyMatch(role -> ROLE_PERMISSIONS.getOrDefault(role.toUpperCase(), Set.of()).contains(permission));
        if (!allowed) throw new AccessDeniedException("Missing permission: " + permission);
    }

    /** Explicit second line of defence; RLS remains the authoritative tenant boundary. */
    public void requireSameSchool(CurrentUser user, UUID targetSchoolId) {
        if (targetSchoolId != null && !targetSchoolId.equals(user.schoolId())) {
            throw new AccessDeniedException("Cross-tenant access denied");
        }
    }
}
