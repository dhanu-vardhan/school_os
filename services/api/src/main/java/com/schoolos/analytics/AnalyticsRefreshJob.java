package com.schoolos.analytics;

import com.schoolos.common.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Minimal @Scheduled refresh (A8-4): no JobRunr, no broker. There is no upstream source
 * today, so the job only records source_available=false watermarks and NEVER inserts facts.
 *
 * <p>Because forced RLS hides the school registry from the runtime role, the schools to
 * watermark are supplied by config (schoolos.analytics.refresh-school-ids). The default is
 * empty: the job then logs the honest "no source" state and writes nothing. A production
 * refresh driven by real Part 3 tables will replace this with a tenant-registered cursor.
 * Only counts and duration are logged — never row contents or personal data.
 */
@Component
public class AnalyticsRefreshJob {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsRefreshJob.class);

    private final AnalyticsRefreshService refreshService;
    private final List<UUID> schoolIds;

    public AnalyticsRefreshJob(
            AnalyticsRefreshService refreshService,
            @Value("${schoolos.analytics.refresh-school-ids:}") String schoolIdsCsv) {
        this.refreshService = refreshService;
        this.schoolIds = parseSchoolIds(schoolIdsCsv);
    }

    @Scheduled(fixedDelayString = "${schoolos.analytics.refresh-delay-ms:3600000}",
            initialDelayString = "${schoolos.analytics.refresh-initial-delay-ms:60000}")
    public void refresh() {
        long started = System.currentTimeMillis();
        int watermarks = 0;
        for (UUID schoolId : schoolIds) {
            TenantContext.set(schoolId);
            try {
                watermarks += refreshService.recordNoSource(schoolId);
            } finally {
                TenantContext.clear();
            }
        }
        log.info("analytics refresh: sourceAvailable=false, schools={}, watermarks={}, durationMs={}",
                schoolIds.size(), watermarks, System.currentTimeMillis() - started);
    }

    private static List<UUID> parseSchoolIds(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return UUID.fromString(s);
                    } catch (IllegalArgumentException e) {
                        log.warn("Ignoring an invalid analytics refresh school id");
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }
}
