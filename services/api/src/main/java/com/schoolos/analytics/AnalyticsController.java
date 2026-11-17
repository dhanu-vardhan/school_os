package com.schoolos.analytics;

import com.schoolos.analytics.AnalyticsContract.Envelope;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

/**
 * Part 8 read-only analytics API. Every mapping has a deny-by-default permission (the
 * catalog test enforces this), plus an explicit policy.require() second line of defence.
 * Tenant scope is derived from the JWT via CurrentUser; no request parameter can widen it.
 */
@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private static final Set<String> ALLOWED_PARAMS = Set.of(
            "from", "to", "term", "year", "classId", "studentKey", "level", "subject",
            "cohort", "grain", "comparisonBasis", "threshold", "metricId", "page",
            "pageSize", "sort", "dimensionA", "dimensionB", "dashboard");

    private final AnalyticsService service;
    private final PolicyService policy;
    private final CurrentUser currentUser;

    public AnalyticsController(AnalyticsService service, PolicyService policy, CurrentUser currentUser) {
        this.service = service;
        this.policy = policy;
        this.currentUser = currentUser;
    }

    @GetMapping("/meta")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<Map<String, Object>> meta(HttpServletRequest request) {
        requireRead(request);
        return service.meta(filters(request));
    }

    @GetMapping("/overview")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> overview(HttpServletRequest request) {
        requireRead(request);
        return service.overview(filters(request));
    }

    @GetMapping("/series")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> series(@RequestParam(name = "metricId") String metricId,
                              HttpServletRequest request) {
        requireRead(request);
        return service.series(metricId(request, metricId), filters(request));
    }

    @GetMapping("/table")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> table(@RequestParam(name = "metricId") String metricId,
                             @RequestParam(name = "page", defaultValue = "0") int page,
                             @RequestParam(name = "pageSize", defaultValue = "50") int pageSize,
                             HttpServletRequest request) {
        requireRead(request);
        if (page < 0 || pageSize < 1 || pageSize > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid page/pageSize");
        }
        return service.table(metricId(request, metricId), filters(request), page, pageSize);
    }

    @GetMapping("/matrix")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> matrix(@RequestParam(name = "metricId") String metricId,
                              HttpServletRequest request) {
        requireRead(request);
        return service.matrix(metricId(request, metricId), filters(request));
    }

    @GetMapping("/insights")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> insights(HttpServletRequest request) {
        requireRead(request);
        return service.insights(filters(request));
    }

    @GetMapping("/explain/{metricId}")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<Map<String, Object>> explain(@PathVariable String metricId,
                                                 HttpServletRequest request) {
        requireRead(request);
        return service.explain(metricId(request, metricId), filters(request));
    }

    @GetMapping("/refresh-state")
    @RequirePermission(PolicyService.ANALYTICS_READ)
    public Envelope<?> refreshState(HttpServletRequest request) {
        requireRead(request);
        return service.refreshState(filters(request));
    }

    @PostMapping("/export")
    @RequirePermission(PolicyService.ANALYTICS_EXPORT)
    public Envelope<String> export(@Valid @RequestBody ExportRequest request,
                                   HttpServletRequest httpRequest) {
        policy.require(currentUser, PolicyService.ANALYTICS_EXPORT); // step-up, defence in depth
        validateParams(httpRequest);
        return service.export(request, AnalyticsFilters.from(httpRequest));
    }

    private void requireRead(HttpServletRequest request) {
        policy.require(currentUser, PolicyService.ANALYTICS_READ);
        validateParams(request);
    }

    /** Unknown parameters are rejected: a typo must never silently widen or change a query. */
    private static void validateParams(HttpServletRequest request) {
        for (String name : request.getParameterMap().keySet()) {
            if (!ALLOWED_PARAMS.contains(name)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown parameter: " + name);
            }
        }
    }

    private static String metricId(HttpServletRequest request, String value) {
        String normalised = value == null ? null : value.trim();
        if (normalised == null || normalised.isEmpty() || normalised.length() > 128
                || !normalised.matches("[a-z_]+(\\.[a-z_0-9]+)+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid metricId");
        }
        return normalised;
    }

    private static AnalyticsFilters filters(HttpServletRequest request) {
        return AnalyticsFilters.from(request);
    }
}
