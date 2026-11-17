package com.schoolos.security;

import com.schoolos.common.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Reads the validated JWT and the membership resolved by the tenant filter. Never trusts request input. */
@Component
public class CurrentUser {

    public static final String MEMBERSHIP_ROLE_ATTRIBUTE = "schoolos.membershipRole";

    public UUID schoolId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object claim = jwt.getClaim("school_id");
            if (claim != null) return UUID.fromString(claim.toString());
        }
        return TenantContext.get();
    }

    public String subject() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) return jwt.getSubject();
        return auth == null ? "anonymous" : auth.getName();
    }

    public List<String> roles() {
        String membershipRole = requestAttribute(MEMBERSHIP_ROLE_ATTRIBUTE);
        if (membershipRole != null && !membershipRole.isBlank()) return List.of(membershipRole);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return List.of();
        if (auth.getPrincipal() instanceof Jwt jwt) {
            List<String> roles = jwt.getClaimAsStringList("roles");
            return roles == null ? List.of() : roles;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring(5))
                .toList();
    }

    public boolean hasRole(String role) {
        return roles().stream().anyMatch(r -> r.equalsIgnoreCase(role) || r.equalsIgnoreCase("ROLE_" + role));
    }

    /** Step-up flag minted by the BFF after a fresh MFA challenge. */
    public boolean stepUpActive() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) return false;
        Object claim = jwt.getClaim("step_up");
        if (claim == null) return false;
        long until = claim instanceof Number n ? n.longValue() : Long.parseLong(claim.toString());
        return until > Instant.now().getEpochSecond();
    }

    public boolean impersonating() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof Jwt jwt && jwt.getClaim("impersonated_by") != null;
    }

    /**
     * Reads a named claim from the validated JWT (null when absent). Used by the analytics
     * export gate to compare a submitted one-time step-up token with the token bound to
     * the freshly verified MFA challenge. Never reads request headers or parameters.
     */
    public String jwtClaim(String name) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) return null;
        Object claim = jwt.getClaim(name);
        return claim == null ? null : claim.toString();
    }

    public String impersonatedBy() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object claim = jwt.getClaim("impersonated_by");
            return claim == null ? null : claim.toString();
        }
        return null;
    }

    private String requestAttribute(String name) {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs == null) return null;
        Object value = attrs.getAttribute(name, RequestAttributes.SCOPE_REQUEST);
        return value == null ? null : value.toString();
    }
}
