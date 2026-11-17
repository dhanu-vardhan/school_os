package com.schoolos.analytics;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Export boundary DTO. Tenant scope is derived from the JWT, never from this body. */
public record ExportRequest(
        @NotBlank @Pattern(regexp = "(?i)csv") String format,
        @Size(max = 50) List<@Size(max = 128) String> metricIds) {

    public List<String> metricIdsOrEmpty() {
        return metricIds == null ? List.of() : metricIds;
    }
}
