package com.schoolos.security;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Token validation shared by the Keycloak and demo decoders. The checks are deliberately
 * explicit so each rejection can be proven by a test: expiry/skew, issuer and audience.
 * Signature and algorithm restrictions are applied by the decoder itself.
 */
public final class JwtValidation {

    public static final String DEFAULT_AUDIENCE = "schoolos-api";
    public static final long DEFAULT_CLOCK_SKEW_SECONDS = 30;

    private JwtValidation() {}

    public static OAuth2TokenValidator<Jwt> validator(String issuer, String audience, Duration clockSkew) {
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(new JwtTimestampValidator(clockSkew == null ? Duration.ofSeconds(DEFAULT_CLOCK_SKEW_SECONDS) : clockSkew));
        if (issuer != null && !issuer.isBlank()) {
            validators.add(new JwtIssuerValidator(issuer));
        }
        if (audience != null && !audience.isBlank()) {
            validators.add(new JwtClaimValidator<List<String>>("aud",
                    aud -> aud != null && aud.contains(audience)));
        }
        // The JWT profile requires an expiry; the timestamp validator only checks it when present.
        validators.add(new JwtClaimValidator<Object>("exp", exp -> exp != null));
        return new DelegatingOAuth2TokenValidator<>(validators);
    }
}
