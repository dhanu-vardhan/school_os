package com.schoolos.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Deny-by-default catalog: every HTTP mapping on a SchoolOS controller must declare a
 * permission or be explicitly public. A new endpoint without a policy fails the build.
 */
class ControllerPolicyCatalogTest {

    @Test
    void everyControllerMappingDeclaresAPolicy() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        List<String> undeclared = new ArrayList<>();
        int mappings = 0;

        for (BeanDefinition definition : scanner.findCandidateComponents("com.schoolos")) {
            Class<?> type = Class.forName(definition.getBeanClassName());
            boolean typeDeclared = AnnotatedElementUtils.hasAnnotation(type, RequirePermission.class)
                    || AnnotatedElementUtils.hasAnnotation(type, PublicEndpoint.class);

            for (Method method : type.getDeclaredMethods()) {
                if (!AnnotatedElementUtils.hasAnnotation(method, RequestMapping.class)) continue;
                mappings++;
                boolean declared = typeDeclared
                        || AnnotatedElementUtils.hasAnnotation(method, RequirePermission.class)
                        || AnnotatedElementUtils.hasAnnotation(method, PublicEndpoint.class);
                if (!declared) {
                    undeclared.add(type.getSimpleName() + "." + method.getName());
                }
            }
        }

        assertThat(mappings).isGreaterThan(0);
        assertThat(undeclared).as("mappings missing @RequirePermission/@PublicEndpoint").isEmpty();
    }

    @Test
    void declaredPermissionsAreNotBlank() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        for (BeanDefinition definition : scanner.findCandidateComponents("com.schoolos")) {
            Class<?> type = Class.forName(definition.getBeanClassName());
            RequirePermission typePermission = AnnotatedElementUtils.findMergedAnnotation(type, RequirePermission.class);
            if (typePermission != null) assertThat(typePermission.value()).isNotBlank();
            for (Method method : type.getDeclaredMethods()) {
                RequirePermission permission = AnnotatedElementUtils.findMergedAnnotation(method, RequirePermission.class);
                if (permission != null) assertThat(permission.value()).isNotBlank();
            }
        }
    }
}
