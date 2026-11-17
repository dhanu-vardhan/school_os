package com.schoolos.config;

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

/**
 * Demo-only security: accepts the short-lived HS256 tokens minted by the BFF instead of
 * requiring a live Keycloak issuer. Production never loads this configuration.
 */
@Configuration
@EnableWebSecurity
@Profile("demo")
public class DemoSecurityConfig {

    @Value("${schoolos.demo.jwt-secret}")
    private String jwtSecret;

    @Bean
    public JwtDecoder demoJwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(
                new javax.crypto.spec.SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    @Bean
    public SecurityFilterChain demoFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/actuator/health", "/actuator/info", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(jwt -> {}))
            .addFilterAfter(new TenantResolutionFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
