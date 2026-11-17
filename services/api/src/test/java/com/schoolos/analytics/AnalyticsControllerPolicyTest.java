package com.schoolos.analytics;

import com.schoolos.security.RequirePermission;
import org.junit.jupiter.api.Test;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

/** Complements the global ControllerPolicyCatalogTest for the analytics surface. */
class AnalyticsControllerPolicyTest {

    @Test
    void everyAnalyticsMappingDeclaresANonBlankPermission() {
        int mappings = 0;
        for (Method method : AnalyticsController.class.getDeclaredMethods()) {
            if (!AnnotatedElementUtils.hasAnnotation(method, RequestMapping.class)) continue;
            mappings++;
            RequirePermission permission = AnnotatedElementUtils.findMergedAnnotation(method, RequirePermission.class);
            assertThat(permission).as("missing @RequirePermission on " + method.getName()).isNotNull();
            assertThat(permission.value()).isNotBlank();
        }
        assertThat(mappings).isGreaterThanOrEqualTo(9);
    }

    @Test
    void exportEndpointUsesTheSensitiveAnalyticsExportPermission() throws Exception {
        Method export = AnalyticsController.class.getMethod("export", ExportRequest.class,
                jakarta.servlet.http.HttpServletRequest.class);
        RequirePermission permission = AnnotatedElementUtils.findMergedAnnotation(export, RequirePermission.class);
        assertThat(permission).isNotNull();
        assertThat(permission.value()).isEqualTo("analytics.export");
    }
}
