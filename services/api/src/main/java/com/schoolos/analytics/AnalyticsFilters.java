package com.schoolos.analytics;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Set;
import java.util.UUID;

/**
 * Application filters, parsed and normalised at the HTTP boundary. Tenant scope is NEVER
 * accepted here: school_id comes only from the validated JWT (AGENTS.md rule 1).
 */
public record AnalyticsFilters(
        LocalDate from,
        LocalDate to,
        String term,
        String year,
        UUID classId,
        UUID studentKey,
        String level,
        String subject,
        String cohort,
        String grain,
        String comparisonBasis,
        Integer threshold) {

    /** Copy with a student-level subject; tenant scope is still derived from the JWT. */
    public AnalyticsFilters withStudentKey(UUID studentKey) {
        return new AnalyticsFilters(from, to, term, year, classId, studentKey,
                level, subject, cohort, grain, comparisonBasis, threshold);
    }

    private static final Set<String> GRAINS = Set.of("day", "week", "month", "term", "year");
    private static final Set<String> COMPARISONS =
            Set.of("previous_period", "previous_term", "previous_year", "benchmark");
    private static final int MAX_TEXT = 128;

    /** Blank and absent values are both normalised to null; no filter means "all in scope". */
    public static AnalyticsFilters from(HttpServletRequest request) {
        LocalDate from = date(request, "from");
        LocalDate to = date(request, "to");
        if (from != null && to != null && from.isAfter(to)) {
            throw bad("from must not be after to");
        }
        String grain = text(request, "grain");
        if (grain != null && !GRAINS.contains(grain)) {
            throw bad("unknown grain: " + grain);
        }
        String comparison = text(request, "comparisonBasis");
        if (comparison != null && !COMPARISONS.contains(comparison)) {
            throw bad("unknown comparisonBasis: " + comparison);
        }
        return new AnalyticsFilters(
                from,
                to,
                text(request, "term"),
                text(request, "year"),
                uuid(request, "classId"),
                uuid(request, "studentKey"),
                text(request, "level"),
                text(request, "subject"),
                text(request, "cohort"),
                grain,
                comparison,
                integer(request, "threshold"));
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static String text(HttpServletRequest request, String name) {
        String value = request.getParameter(name);
        if (value == null) return null;
        value = value.trim();
        if (value.isEmpty()) return null;
        if (value.length() > MAX_TEXT) throw bad(name + " is too long");
        return value;
    }

    private static LocalDate date(HttpServletRequest request, String name) {
        String value = text(request, name);
        if (value == null) return null;
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException e) {
            throw bad(name + " must be an ISO date");
        }
    }

    private static UUID uuid(HttpServletRequest request, String name) {
        String value = text(request, name);
        if (value == null) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw bad(name + " must be a UUID");
        }
    }

    private static Integer integer(HttpServletRequest request, String name) {
        String value = text(request, name);
        if (value == null) return null;
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException e) {
            throw bad(name + " must be an integer");
        }
    }
}
