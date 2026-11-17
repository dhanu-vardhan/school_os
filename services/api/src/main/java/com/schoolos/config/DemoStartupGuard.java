package com.schoolos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Refuses unsafe demo startup configurations before any seed data is written. This is the
 * server half of the rule the BFF enforces in `assertSafeConfig`: demo is a local-only,
 * explicitly opt-in profile, never a production fallback.
 */
@Component
@Profile("demo")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DemoStartupGuard implements ApplicationRunner {

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${schoolos.demo.jwt-secret:}")
    private String jwtSecret;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}")
    private String issuerUri;

    @Value("${schoolos.demo.credentials-file:}")
    private String credentialsFile;

    @Override
    public void run(ApplicationArguments args) {
        validate(System.getenv(), datasourceUrl, jwtSecret, issuerUri, credentialsFile);
    }

    /** Package-private so the refusal rules can be tested without starting the demo profile. */
    static void validate(Map<String, String> env, String datasource, String jwtSecret,
                         String issuer, String credentialsFile) {
        String environment = firstNonBlank(env.get("SCHOOLOS_ENV"), env.get("ENV"), "local").toLowerCase();
        boolean production = environment.equals("prod") || environment.equals("production");

        if (production) {
            throw new IllegalStateException("Refusing to start the demo profile in a production environment");
        }
        if (!"true".equalsIgnoreCase(env.get("DEMO_MODE"))) {
            throw new IllegalStateException("The demo profile requires DEMO_MODE=true (explicit opt-in)");
        }
        if (!isLocal(datasource)) {
            throw new IllegalStateException("Refusing to start the demo profile against a non-local datasource");
        }
        if (!isLocal(issuer)) {
            throw new IllegalStateException("Refusing to start the demo profile with a non-local OIDC issuer");
        }
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException("Demo JWT secret must be at least 32 characters");
        }
        if (looksLikeDefaultSecret(jwtSecret) && !environment.equals("local")) {
            throw new IllegalStateException("Demo JWT secret still uses the public development default");
        }
        if ("false".equalsIgnoreCase(env.get("COOKIE_SECURE")) && !environment.equals("local")) {
            throw new IllegalStateException("Demo cookies cannot be insecure outside a local environment");
        }
        if (credentialsFile != null && !credentialsFile.isBlank() && !Files.exists(Path.of(credentialsFile))) {
            throw new IllegalStateException("Configured demo credentials file does not exist: " + credentialsFile);
        }
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }
        return "";
    }

    private static boolean isLocal(String value) {
        if (value == null || value.isBlank()) return true; // not configured: nothing remote to trust
        return value.contains("localhost") || value.contains("127.0.0.1")
                || value.contains("//postgres:") || value.contains("//db:")
                || value.contains("//keycloak:");
    }

    private static boolean looksLikeDefaultSecret(String value) {
        return value.contains("change-me") || value.contains("changeme")
                || value.contains("schoolos-local-demo");
    }
}
