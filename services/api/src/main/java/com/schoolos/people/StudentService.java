package com.schoolos.people;

import com.schoolos.common.TenantContext;
import com.schoolos.common.Uuids;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class StudentService {

    private final StudentRepository repo;
    private final StudentAccessService access;

    public StudentService(StudentRepository repo, StudentAccessService access) {
        this.repo = repo;
        this.access = access;
    }

    @Transactional
    public Student create(Student s) {
        if (s.getId() == null) s.setId(Uuids.newId());
        s.setSchoolId(TenantContext.get());
        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public List<Student> list() {
        if (!access.isScoped()) return repo.findAll();
        Set<UUID> visible = access.visibleStudentIds();
        if (visible.isEmpty()) return List.of();
        return repo.findAllById(visible);
    }

    @Transactional(readOnly = true)
    public Student get(UUID id) {
        Student student = repo.findById(id).orElseThrow();
        if (!access.canRead(id)) {
            // Same response as a missing row: do not reveal that another family's child exists.
            throw new AccessDeniedException("Student is outside the caller's scope");
        }
        return student;
    }
}
