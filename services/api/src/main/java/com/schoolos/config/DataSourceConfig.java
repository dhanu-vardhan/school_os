package com.schoolos.config;

import com.schoolos.security.TenantAwareDataSource;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties props) {
        return new TenantAwareDataSource(rawDataSource(props));
    }

    /**
     * Unwrapped pool, used only by startup seed code that binds the tenant explicitly.
     * Never inject this into request-scoped services: it has no automatic tenant binding.
     */
    @Bean(name = "rawDataSource")
    public DataSource rawDataSource(DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }
}
