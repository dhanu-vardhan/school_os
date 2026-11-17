package com.schoolos.security;

import com.schoolos.common.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class TenantResolutionFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object claim = jwt.getClaim("school_id");
            if (claim == null) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "missing school_id");
                return;
            }
            try {
                TenantContext.set(UUID.fromString(claim.toString()));
            } catch (IllegalArgumentException e) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "invalid school_id");
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
