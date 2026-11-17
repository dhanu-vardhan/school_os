package com.schoolos.tenancy;

import com.schoolos.common.TenantContext;
import com.schoolos.common.Uuids;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class SchoolService {

    private final SchoolRepository repo;
    private final EntityManager em;

    public SchoolService(SchoolRepository repo, EntityManager em) {
        this.repo = repo;
        this.em = em;
    }

    @Transactional
    public School create(String name) {
        UUID id = Uuids.newId();
        TenantContext.set(id);
        em.createNativeQuery("SELECT set_config('app.current_school', :v, true)")
                .setParameter("v", id.toString()).getSingleResult();
        School s = new School();
        s.setId(id);
        s.setSchoolId(id);
        s.setName(name);
        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public List<School> list() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public School get(UUID id) {
        return repo.findById(id).orElseThrow();
    }
}
