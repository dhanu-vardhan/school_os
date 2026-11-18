package com.schoolos.people;

import com.schoolos.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Row scope inside a tenant. Staff see the school; a guardian sees linked children; a
 * student sees their own record. RLS still enforces the tenant boundary underneath.
 */
@Service
public class StudentAccessService {

    private final CurrentUser currentUser;
    private final GuardianChildRepository guardianChildren;
    private final StudentRepository students;

    public StudentAccessService(CurrentUser currentUser,
                                GuardianChildRepository guardianChildren,
                                StudentRepository students) {
        this.currentUser = currentUser;
        this.guardianChildren = guardianChildren;
        this.students = students;
    }

    public boolean isScoped() {
        return currentUser.hasRole("GUARDIAN") || currentUser.hasRole("STUDENT");
    }

    /** Empty set means "no rows"; null is never returned, so callers cannot widen scope by accident. */
    @Transactional(readOnly = true)
    public Set<UUID> visibleStudentIds() {
        if (currentUser.hasRole("GUARDIAN")) {
            return guardianChildren.findActiveByGuardianSubject(currentUser.subject(), java.time.LocalDate.now()).stream()
                    .map(GuardianChild::getStudentId)
                    .collect(Collectors.toUnmodifiableSet());
        }
        if (currentUser.hasRole("STUDENT")) {
            return students.findByUserSubject(currentUser.subject()).stream()
                    .map(Student::getId)
                    .collect(Collectors.toUnmodifiableSet());
        }
        return Set.of();
    }

    @Transactional(readOnly = true)
    public boolean canRead(UUID studentId) {
        if (!isScoped()) return true;
        return visibleStudentIds().contains(studentId);
    }
}
