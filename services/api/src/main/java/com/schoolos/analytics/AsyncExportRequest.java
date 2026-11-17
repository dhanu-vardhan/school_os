package com.schoolos.analytics;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Boundary DTO for the governed async export endpoint. Step-up comes from the validated
 * JWT (PolicyService), never from this body; the watermark must be explicitly confirmed.
 */
public record AsyncExportRequest(
        @NotBlank @Pattern(regexp = "(?i)csv") String format,
        @Size(max = 50) List<@Size(max = 128) String> metricIds,
        @Size(max = 128) String idempotencyKey,
        @NotNull Boolean confirmWatermark) {

    public List<String> metricIdsOrEmpty() {
        return metricIds == null ? List.of() : metricIds;
    }
}
