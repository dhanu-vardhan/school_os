package com.schoolos.security;

import com.schoolos.common.TenantContext;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;

public class TenantJpaTransactionManager extends JpaTransactionManager {

    private final DataSource dataSource;

    public TenantJpaTransactionManager(EntityManagerFactory emf, DataSource dataSource) {
        super(emf);
        this.dataSource = dataSource;
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        super.doBegin(transaction, definition);
        UUID schoolId = TenantContext.get();
        if (schoolId == null) {
            throw new IllegalStateException("No tenant in context");
        }
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("SELECT set_config('app.current_school', ?, true)")) {
            ps.setString(1, schoolId.toString());
            ps.execute();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to bind tenant", e);
        }
    }
}
