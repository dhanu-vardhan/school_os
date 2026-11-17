package com.schoolos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Refuses unsafe demo startup configurations before any seed data is written. */
@Component
@Profile("demo")
public class DemoStartupGuard implements ApplicationRunner {

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${schoolos.demo.jwt-secret:}")
    private String jwtSecret;

    @Override
    public void run(ApplicationArguments args) {
        String env = System.getenv().getOrDefault("SCHOOLOS_ENV",
                System.getenv().getOrDefault("ENV", "local")).toLowerCase();
        if (env.equals("prod") || env.equals("production")) {
            throw new IllegalStateException("Refusing to start the demo profile in a production environment");
        }
        if (datasourceUrl == null || !(datasourceUrl.contains("localhost") || datasourceUrl.contains("127.0.0.1")
                || datasourceUrl.contains("//postgres:") || datasourceUrl.contains("//db:"))) {
            throw new IllegalStateException("Refusing to start the demo profile against a non-local datasource");
        }
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("Demo JWT secret must be at least 32 characters");
        }
    }
}
