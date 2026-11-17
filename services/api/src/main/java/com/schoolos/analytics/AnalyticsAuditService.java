package com.schoolos.analytics;

import com.schoolos.common.Uuids;
import com.schoolos.security.CurrentUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Append-only analytics audit trail. Records WHO accessed WHICH metric at WHAT scope and
 * WHEN — never metric values, pseudonymous keys or personal data (docs/ANALYTICS_DESIGN.md §5).
 * The table has INSERT-only privileges for the runtime role, so a log entry cannot be
 * rewritten. A BFF-side hash chain may additionally seal these rows; the Java slice does
 * not own that log and does not modify it.
 */
@Service
public class AnalyticsAuditService implements AnalyticsAuditSink {

    private static final String INSERT =
            "INSERT INTO analytics_audit_event " +
            "(id, school_id, actor_sub, event_type, metric_id, scope, occurred_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)";

    private final JdbcTemplate jdbc;
    private final CurrentUser currentUser;

    public AnalyticsAuditService(JdbcTemplate jdbc, CurrentUser currentUser) {
        this.jdbc = jdbc;
        this.currentUser = currentUser;
    }

    /** Called for every student-level access attempt (allowed or denied) and every export. */
    @Override
    public void record(String eventType, String metricId, String scope) {
        jdbc.update(INSERT,
                Uuids.newId(),
                currentUser.schoolId(),
                currentUser.subject(),
                eventType,
                metricId,
                scope,
                Timestamp.from(Instant.now()));
    }
}
