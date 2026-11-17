package com.schoolos.analytics;

import com.schoolos.analytics.AnalyticsContract.Envelope;
import com.schoolos.analytics.AnalyticsContract.Meta;
import com.schoolos.analytics.AnalyticsContract.MetricDefinition;
import com.schoolos.analytics.AnalyticsExportService.ExportJob;
import com.schoolos.analytics.AnalyticsSavedViewService.SavedViewDto;
import com.schoolos.analytics.AnalyticsSavedViewService.SavedViewRequest;
import com.schoolos.security.CurrentUser;
import com.schoolos.security.PolicyService;
import com.schoolos.security.RequirePermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Governed Part 8 API. This is the documented {@code /api/analytics} facade; the sibling
 * {@code /api/v1/analytics} controller delegates to the same service. Tenant scope is always
 * the validated JWT school_id, never a request parameter or body field.
 */
@RestController
@RequestMapping("/api/analytics")
@RequirePermission(PolicyService.ANALYTICS_READ)
public class AnalyticsApiController {

    private static final Set<String> ALLOWED_PARAMS = Set.of(
            "from", "to", "term", "year", "classId", "studentKey", "level", "subject",
            "cohort", "grain", "comparisonBasis", "threshold", "metricId", "page",
            "pageSize", "sort", "dimensionA", "dimensionB", "dashboard");

    private final AnalyticsService service;
    private final AnalyticsExportService exports;
    private final AnalyticsSavedViewService savedViews;
    private final PolicyService policy;
    private final CurrentUser currentUser;

    public AnalyticsApiController(AnalyticsService service, AnalyticsExportService exports,
                                  AnalyticsSavedViewService savedViews, PolicyService policy,
                                  CurrentUser currentUser) {
        this.service = service;
        this.exports = exports;
        this.savedViews = savedViews;
        this.policy = policy;
        this.currentUser = currentUser;
    }

    @GetMapping("/dictionary")
    public Envelope<List<MetricDefinition>> dictionary() {
        Meta meta = new Meta(List.of(), 0L, null, null, false, 5, false,
                Instant.now().toString(), false, true,
                Map.of("dictionaryVersion", "1.0.0"), false);
        return new Envelope<>(service.dictionary(), meta);
    }

    @GetMapping("/dashboard")
    public Envelope<?> dashboard(HttpServletRequest request) {
        return service.overview(filters(request));
    }

    @GetMapping("/overview")
    public Envelope<?> overview(HttpServletRequest request) {
        return service.overview(filters(request));
    }

    @GetMapping("/trends/{metricId}")
    public Envelope<?> trends(@PathVariable String metricId, HttpServletRequest request) {
        return service.series(metricId(metricId), filters(request));
    }

    @GetMapping("/cohorts/{metricId}")
    public Envelope<?> cohorts(@PathVariable String metricId,
                               @RequestParam(name = "page", defaultValue = "0") int page,
                               @RequestParam(name = "pageSize", defaultValue = "50") int pageSize,
                               HttpServletRequest request) {
        validatePage(page, pageSize);
        return service.table(metricId(metricId), filters(request), page, pageSize);
    }

    @GetMapping("/students/{studentId}")
    public Envelope<?> student(@PathVariable String studentId,
                               @RequestParam(name = "metricId") String metricId,
                               HttpServletRequest request) {
        policy.require(currentUser, PolicyService.ANALYTICS_STUDENT);
        UUID subject;
        try {
            subject = UUID.fromString(studentId);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid studentId");
        }
        return service.series(metricId(metricId), filters(request).withStudentKey(subject));
    }

    @GetMapping("/insights")
    public Envelope<?> insights(HttpServletRequest request) {
        return service.insights(filters(request));
    }

    @GetMapping("/explain/{metricId}")
    public Envelope<Map<String, Object>> explain(@PathVariable String metricId, HttpServletRequest request) {
        return service.explain(metricId(metricId), filters(request));
    }

    @GetMapping("/meta/freshness")
    public Envelope<?> freshness(HttpServletRequest request) {
        return service.refreshState(filters(request));
    }

    @GetMapping("/{metricId}/series")
    public Envelope<?> series(@PathVariable String metricId, HttpServletRequest request) {
        return service.series(metricId(metricId), filters(request));
    }

    @GetMapping("/{metricId}/table")
    public Envelope<?> table(@PathVariable String metricId,
                             @RequestParam(name = "page", defaultValue = "0") int page,
                             @RequestParam(name = "pageSize", defaultValue = "50") int pageSize,
                             HttpServletRequest request) {
        validatePage(page, pageSize);
        return service.table(metricId(metricId), filters(request), page, pageSize);
    }

    @GetMapping("/{metricId}/matrix")
    public Envelope<?> matrix(@PathVariable String metricId, HttpServletRequest request) {
        return service.matrix(metricId(metricId), filters(request));
    }

    @PostMapping("/exports")
    @RequirePermission(PolicyService.ANALYTICS_EXPORT)
    public ResponseEntity<ExportJob> startExport(@Valid @RequestBody AsyncExportRequest request,
                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(exports.start(request, filters(httpRequest)));
    }

    @GetMapping("/exports/{id}")
    @RequirePermission(PolicyService.ANALYTICS_EXPORT)
    public ExportJob exportStatus(@PathVariable String id) {
        UUID jobId;
        try {
            jobId = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid export id");
        }
        return exports.status(jobId);
    }

    @GetMapping("/views")
    public List<SavedViewDto> views() {
        return savedViews.list();
    }

    @PostMapping("/views")
    public SavedViewDto saveView(@Valid @RequestBody SavedViewRequest request) {
        return savedViews.save(request);
    }

    @DeleteMapping("/views/{id}")
    public ResponseEntity<Void> deleteView(@PathVariable String id) {
        UUID viewId;
        try {
            viewId = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid view id");
        }
        savedViews.delete(viewId);
        return ResponseEntity.noContent().build();
    }

    private static AnalyticsFilters filters(HttpServletRequest request) {
        for (String name : request.getParameterMap().keySet()) {
            if (!ALLOWED_PARAMS.contains(name)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unknown parameter: " + name);
            }
        }
        return AnalyticsFilters.from(request);
    }

    private static String metricId(String value) {
        String normalised = value == null ? null : value.trim();
        if (normalised == null || normalised.isEmpty() || normalised.length() > 128
                || !normalised.matches("[a-z_]+(\\.[a-z_0-9]+)+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid metricId");
        }
        return normalised;
    }

    private static void validatePage(int page, int pageSize) {
        if (page < 0 || pageSize < 1 || pageSize > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid page/pageSize");
        }
    }
}
