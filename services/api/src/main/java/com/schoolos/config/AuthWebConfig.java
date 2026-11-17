package com.schoolos.config;

import com.schoolos.security.PermissionInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the permission interceptor outside tests. Tests exercise services directly and
 * the catalog test covers annotations, so the test profile stays free of request state.
 */
@Configuration
@Profile("!test")
public class AuthWebConfig implements WebMvcConfigurer {

    private final PermissionInterceptor permissionInterceptor;

    public AuthWebConfig(PermissionInterceptor permissionInterceptor) {
        this.permissionInterceptor = permissionInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(permissionInterceptor);
    }
}
