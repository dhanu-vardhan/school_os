package com.schoolos.config;

import com.schoolos.security.JwtValidation;
import com.schoolos.security.MembershipResolver;
import com.schoolos.security.TenantResolutionFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Demo-only security: accepts the short-lived HS256 tokens minted by the BFF instead of
 * requiring a live Keycloak issuer. Production never loads this configuration.
 */
@Configuration
@EnableWebSecurity
@Profile("demo")
public class DemoSecurityConfig {

    public static final String DEMO_ISSUER = "schoolos-demo";

    @Value("${schoolos.demo.jwt-secret}")
    private String jwtSecret;

    @Value("${schoolos.auth.audience:" + JwtValidation.DEFAULT_AUDIENCE + "}")
    private String audience;

    @Bean
    public JwtDecoder demoJwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(
                new javax.crypto.spec.SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        decoder.setJwtValidator(JwtValidation.validator(DEMO_ISSUER, audience,
                Duration.ofSeconds(JwtValidation.DEFAULT_CLOCK_SKEW_SECONDS)));
        return decoder;
    }

    @Bean
    public SecurityFilterChain demoFilterChain(HttpSecurity http, MembershipResolver membershipResolver,
                                               JwtDecoder demoJwtDecoder) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health", "/actuator/info", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(jwt -> jwt
                .decoder(demoJwtDecoder)
                .jwtAuthenticationConverter(SecurityConfig.jwtAuthenticationConverter())))
            .addFilterAfter(new TenantResolutionFilter(membershipResolver), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
