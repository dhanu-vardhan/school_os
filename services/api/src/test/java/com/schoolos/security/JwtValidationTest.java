package com.schoolos.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Proves each claim check independently: issuer, audience, expiry and the 30s skew. */
class JwtValidationTest {

    private static final String ISSUER = "https://sso.schoolos.test/realms/schoolos";
    private static final String AUDIENCE = "schoolos-api";

    private final OAuth2TokenValidator<Jwt> validator =
            JwtValidation.validator(ISSUER, AUDIENCE, Duration.ofSeconds(30));

    private static Jwt token(String issuer, List<String> audience, Instant expiresAt) {
        Jwt.Builder builder = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("user-1");
        if (issuer != null) builder.issuer(issuer);
        if (audience != null) builder.audience(audience);
        if (expiresAt != null) builder.expiresAt(expiresAt);
        return builder.build();
    }

    @Test
    void acceptsAValidToken() {
        assertThat(validator.validate(token(ISSUER, List.of(AUDIENCE), Instant.now().plusSeconds(120))).hasErrors())
                .isFalse();
    }

    @Test
    void rejectsTheWrongIssuer() {
        assertThat(validator.validate(token("https://evil.test/realms/schoolos", List.of(AUDIENCE),
                Instant.now().plusSeconds(120))).hasErrors()).isTrue();
    }

    @Test
    void rejectsTheWrongAudience() {
        assertThat(validator.validate(token(ISSUER, List.of("account"),
                Instant.now().plusSeconds(120))).hasErrors()).isTrue();
    }

    @Test
    void acceptsAReasonableAudienceList() {
        assertThat(validator.validate(token(ISSUER, List.of("account", AUDIENCE),
                Instant.now().plusSeconds(120))).hasErrors()).isFalse();
    }

    @Test
    void rejectsAnExpiredTokenBeyondTheSkew() {
        assertThat(validator.validate(token(ISSUER, List.of(AUDIENCE),
                Instant.now().minusSeconds(31))).hasErrors()).isTrue();
    }

    @Test
    void acceptsATokenExpiredInsideTheSkewWindow() {
        assertThat(validator.validate(token(ISSUER, List.of(AUDIENCE),
                Instant.now().minusSeconds(10))).hasErrors()).isFalse();
    }

    @Test
    void rejectsATokenWithoutExpiry() {
        assertThat(validator.validate(token(ISSUER, List.of(AUDIENCE), null)).hasErrors()).isTrue();
    }
}
