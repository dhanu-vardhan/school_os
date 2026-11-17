package com.schoolos.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Write side for governed aggregate cells; RLS keeps every write inside the JWT tenant. */
public interface AnalyticsAggregateRepository extends JpaRepository<AnalyticsAggregate, UUID> {
}
