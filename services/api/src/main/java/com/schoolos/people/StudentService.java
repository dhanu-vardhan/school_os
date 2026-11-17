package com.schoolos.people;

import com.schoolos.common.TenantContext;
import com.schoolos.common.Uuids;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StudentService {

    private final StudentRepository repo;

    public StudentService(StudentRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public Student create(Student s) {
        if (s.getId() == null) s.setId(Uuids.newId());
        s.setSchoolId(TenantContext.get());
        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public List<Student> list() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Student get(UUID id) {
        return repo.findById(id).orElseThrow();
    }
}
