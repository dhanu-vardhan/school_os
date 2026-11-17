package com.schoolos.security;

import com.schoolos.common.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/** Reads the validated JWT only. Never derives the school from request input. */
@Component
public class CurrentUser {

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
}
