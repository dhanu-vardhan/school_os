package com.schoolos.config;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Each refusal is a separate test so a weakened guard is visible in CI. */
class DemoStartupGuardTest {

    private static final String SECRET = "demo-secret-that-is-long-enough-1234567890";

    private Map<String, String> env() {
        Map<String, String> env = new HashMap<>();
        env.put("SCHOOLOS_ENV", "local");
        env.put("DEMO_MODE", "true");
        return env;
    }

    private void validate(Map<String, String> env) {
        DemoStartupGuard.validate(env,
                "jdbc:postgresql://localhost:5432/schoolos",
                SECRET,
                "http://localhost:8081/realms/schoolos",
                null);
    }

    @Test
    void acceptsALocalExplicitDemo() {
        assertThatCode(() -> validate(env())).doesNotThrowAnyException();
    }

    @Test
    void refusesTheDemoProfileInProduction() {
        Map<String, String> env = env();
        env.put("SCHOOLOS_ENV", "production");
        assertThatThrownBy(() -> validate(env)).hasMessageContaining("production");
    }

    @Test
    void refusesDemoWithoutTheExplicitOptIn() {
        Map<String, String> env = env();
        env.remove("DEMO_MODE");
        assertThatThrownBy(() -> validate(env)).hasMessageContaining("DEMO_MODE");
    }

    @Test
    void refusesANonLocalDatasource() {
        assertThatThrownBy(() -> DemoStartupGuard.validate(env(),
                "jdbc:postgresql://db.prod.example.com:5432/schoolos",
                SECRET, "http://localhost:8081/realms/schoolos", null))
                .hasMessageContaining("non-local datasource");
    }

    @Test
    void refusesANonLocalIssuer() {
        assertThatThrownBy(() -> DemoStartupGuard.validate(env(),
                "jdbc:postgresql://localhost:5432/schoolos",
                SECRET, "https://sso.schoolos.example.com/realms/schoolos", null))
                .hasMessageContaining("non-local OIDC issuer");
    }

    @Test
    void refusesAShortJwtSecret() {
        assertThatThrownBy(() -> DemoStartupGuard.validate(env(),
                "jdbc:postgresql://localhost:5432/schoolos",
                "too-short", "http://localhost:8081/realms/schoolos", null))
                .hasMessageContaining("at least 32 characters");
    }

    @Test
    void refusesThePublicDefaultSecretOutsideLocal() {
        Map<String, String> env = env();
        env.put("SCHOOLOS_ENV", "staging");
        assertThatThrownBy(() -> DemoStartupGuard.validate(env,
                "jdbc:postgresql://localhost:5432/schoolos",
                "schoolos-local-demo-jwt-secret-change-me",
                "http://localhost:8081/realms/schoolos", null))
                .hasMessageContaining("default");
    }

    @Test
    void refusesInsecureCookiesOutsideLocal() {
        Map<String, String> env = env();
        env.put("SCHOOLOS_ENV", "staging");
        env.put("COOKIE_SECURE", "false");
        assertThatThrownBy(() -> validate(env)).hasMessageContaining("insecure");
    }

    @Test
    void refusesAMissingCredentialsFile() {
        assertThatThrownBy(() -> DemoStartupGuard.validate(env(),
                "jdbc:postgresql://localhost:5432/schoolos",
                SECRET, "http://localhost:8081/realms/schoolos",
                "/tmp/schoolos-demo-credentials-does-not-exist.json"))
                .hasMessageContaining("credentials file");
    }
}
