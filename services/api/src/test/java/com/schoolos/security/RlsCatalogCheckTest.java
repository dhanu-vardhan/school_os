package com.schoolos.security;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class RlsCatalogCheckTest {

    @Autowired EntityManager em;

    @Test
    void allTenantTablesHaveForcedRls() {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT c.relname FROM pg_class c " +
                "WHERE c.relkind='r' AND c.relname IN " +
                "(SELECT table_name FROM information_schema.columns WHERE column_name='school_id' AND table_schema='public') " +
                "AND NOT c.relforcerowsecurity").getResultList();
        assertThat(rows).isEmpty();
    }
}
