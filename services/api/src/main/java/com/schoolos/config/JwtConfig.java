package com.schoolos.config;

import com.schoolos.security.JwtValidation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.time.Duration;

/**
 * Production token validation. The realm is the only issuer we trust; JWKS is fetched
 * lazily from Keycloak and only RS256 is accepted so algorithm-confusion tokens fail.
 */
@Configuration
@Profile("!test & !demo")
public class JwtConfig {

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
            @Value("${schoolos.auth.audience:" + JwtValidation.DEFAULT_AUDIENCE + "}") String audience,
            @Value("${schoolos.auth.clock-skew-seconds:" + JwtValidation.DEFAULT_CLOCK_SKEW_SECONDS + "}") long clockSkewSeconds) {
        String jwksUri = issuer.replaceAll("/+$", "") + "/protocol/openid-connect/certs";
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwksUri)
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        decoder.setJwtValidator(JwtValidation.validator(issuer, audience, Duration.ofSeconds(clockSkewSeconds)));
        return decoder;
    }
}
