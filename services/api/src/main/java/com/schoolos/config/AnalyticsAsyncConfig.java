package com.schoolos.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Dedicated executor for Part 8 export jobs. Requests stay fast; the job stores only a
 * watermarked CSV result and never logs metric values or personal data.
 */
@Configuration
@EnableAsync
public class AnalyticsAsyncConfig {

    @Bean("analyticsExportExecutor")
    public TaskExecutor analyticsExportExecutor(
            @Value("${schoolos.analytics.exports.core-pool-size:2}") int corePoolSize,
            @Value("${schoolos.analytics.exports.max-pool-size:4}") int maxPoolSize,
            @Value("${schoolos.analytics.exports.queue-capacity:100}") int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(corePoolSize);
        executor.setMaxPoolSize(maxPoolSize);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix("analytics-export-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.initialize();
        return executor;
    }
}
