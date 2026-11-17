package com.schoolos.security;

import com.schoolos.common.TenantContext;
import com.schoolos.tenancy.Membership;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Resolves the active tenant from the validated JWT, proves membership, then rewrites the
 * authentication to the membership role (the claim role is not trusted beyond the check).
 */
public class TenantResolutionFilter extends OncePerRequestFilter {

    private final MembershipResolver membershipResolver;

    public TenantResolutionFilter(MembershipResolver membershipResolver) {
        this.membershipResolver = membershipResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            try {
                Membership membership = membershipResolver.requireActiveMembership(jwt);
                UUID schoolId = membership.getSchoolId();
                TenantContext.set(schoolId);
                request.setAttribute(CurrentUser.MEMBERSHIP_ROLE_ATTRIBUTE, membership.getRole().name());
                var rewritten = new JwtAuthenticationToken(
                        jwt,
                        List.of(new SimpleGrantedAuthority("ROLE_" + membership.getRole().name())),
                        jwt.getSubject());
                SecurityContextHolder.getContext().setAuthentication(rewritten);
            } catch (AccessDeniedException e) {
                SecurityContextHolder.clearContext();
                TenantContext.clear();
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"forbidden\",\"reason\":\"membership\"}");
                return;
            }
        }
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
