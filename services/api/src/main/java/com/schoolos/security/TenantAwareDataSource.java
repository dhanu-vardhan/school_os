package com.schoolos.security;

import com.schoolos.common.TenantContext;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;

public class TenantAwareDataSource extends DelegatingDataSource {

    public TenantAwareDataSource(DataSource targetDataSource) {
        super(targetDataSource);
    }

    @Override
    public Connection getConnection() throws java.sql.SQLException {
        Connection c = super.getConnection();
        bind(c);
        return c;
    }

    @Override
    public Connection getConnection(String username, String password) throws java.sql.SQLException {
        Connection c = super.getConnection(username, password);
        bind(c);
        return c;
    }

    private void bind(Connection c) {
        UUID schoolId = TenantContext.get();
        if (schoolId == null) return;
        try {
            if (c.getAutoCommit()) {
                c.setAutoCommit(false);
            }
            try (PreparedStatement ps = c.prepareStatement("SELECT set_config('app.current_school', ?, true)")) {
                ps.setString(1, schoolId.toString());
                ps.execute();
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to bind tenant", e);
        }
    }
}
