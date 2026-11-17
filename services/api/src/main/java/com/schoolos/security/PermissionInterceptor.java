package com.schoolos.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Runtime enforcement of {@link RequirePermission}. The catalog test is the compile-time
 * half of the same rule: every SchoolOS handler must declare a permission or be explicitly
 * public, and anything unannotated is denied rather than silently allowed.
 */
@Component
public class PermissionInterceptor implements HandlerInterceptor {

    private final PolicyService policy;
    private final CurrentUser currentUser;

    public PermissionInterceptor(PolicyService policy, CurrentUser currentUser) {
        this.policy = policy;
        this.currentUser = currentUser;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod method)) return true;

        RequirePermission permission = method.getMethodAnnotation(RequirePermission.class);
        if (permission == null) permission = method.getBeanType().getAnnotation(RequirePermission.class);
        if (permission != null) {
            policy.require(currentUser, permission.value());
            return true;
        }

        boolean ours = method.getBeanType().getPackageName().startsWith("com.schoolos");
        boolean declaredPublic = method.hasMethodAnnotation(PublicEndpoint.class)
                || method.getBeanType().isAnnotationPresent(PublicEndpoint.class);
        if (ours && !declaredPublic) {
            throw new AccessDeniedException("Endpoint has no policy declaration: "
                    + method.getBeanType().getSimpleName() + "." + method.getMethod().getName());
        }
        return true;
    }
}
