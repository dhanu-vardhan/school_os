package com.schoolos.analytics;

import java.util.Set;
import java.util.UUID;

/**
 * Authoritative row scope for one analytics request, derived only from the JWT role and
 * server-side membership. RLS remains the outer tenant boundary.
 *
 * @param allowedClassIds    null = all classes within the tenant; empty = no class rows
 * @param allowedStudentKeys null = all pseudonymous keys; empty = no student rows
 * @param studentLevel       whether pseudonymous student-level rows may be read (audited)
 * @param suppressionThreshold clamped 3–20, default 5 (A8-3)
 */
public record AnalyticsScope(
        Set<UUID> allowedClassIds,
        Set<UUID> allowedStudentKeys,
        boolean studentLevel,
        int suppressionThreshold) {

    public boolean allowsClass(UUID classId) {
        return classId == null || allowedClassIds == null || allowedClassIds.contains(classId);
    }

    public boolean allowsStudent(UUID studentKey) {
        return studentKey == null || allowedStudentKeys == null || allowedStudentKeys.contains(studentKey);
    }
}
