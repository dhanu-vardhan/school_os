package com.schoolos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Scheduling is enabled for the real application only. The "test" profile leaves the
 * analytics refresh job dormant so unit and catalog tests never race a background task
 * or touch a database unexpectedly.
 */
@Configuration
@EnableScheduling
@Profile("!test")
public class AnalyticsSchedulingConfig {
}
