package com.schoolos.analytics;

/** Small seam so the policy/service unit tests can assert audits without a database. */
@FunctionalInterface
public interface AnalyticsAuditSink {
    void record(String eventType, String metricId, String scope);
}
