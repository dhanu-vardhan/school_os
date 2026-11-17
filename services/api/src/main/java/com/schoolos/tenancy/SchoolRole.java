package com.schoolos.tenancy;

/**
 * Canonical school roles. Names match the BFF/Keycloak realm roles
 * (see docs/AUTH_DESIGN.md §3). Legacy values are kept so existing data keeps loading.
 */
public enum SchoolRole {
    PLATFORM_ADMIN,
    GROUP_ADMIN,
    DIRECTOR,
    ADMIN,
    DEPUTY,
    TEACHER,
    ASSISTANT,
    SAFEGUARDING,
    NURSE,
    FINANCE,
    ACCOUNTANT,
    HR,
    IT_ADMIN,
    LIBRARIAN,
    RECEPTION,
    AUDITOR,
    GUARDIAN,
    STUDENT,
    ADMISSIONS,
    INSTRUCTOR,
    PROVIDER,
    THERAPIST,
    /** Part 8: pseudonymised, audited student-level exploration; no direct identifiers. */
    DATA_ANALYST,
    OPERATOR,
    OWNER;

    public static SchoolRole fromClaim(String value) {
        if (value == null) return null;
        String normalized = value.trim().toUpperCase().replace("ROLE_", "");
        return switch (normalized) {
            case "PARENT" -> GUARDIAN;
            case "HEAD", "SCHOOL_HEAD" -> DIRECTOR;
            case "SCHOOL_ADMIN" -> ADMIN;
            case "VIE_SCOLAIRE" -> DEPUTY;
            case "HEALTH" -> NURSE;
            case "BURSAR" -> FINANCE;
            case "IT" -> IT_ADMIN;
            case "RECEPTIONIST" -> RECEPTION;
            case "INSPECTOR" -> AUDITOR;
            case "SUPER_ADMIN", "SUPERADMIN" -> PLATFORM_ADMIN;
            default -> {
                try {
                    yield SchoolRole.valueOf(normalized);
                } catch (IllegalArgumentException e) {
                    yield null;
                }
            }
        };
    }

    public boolean requiresMfa() {
        return switch (this) {
            case PLATFORM_ADMIN, GROUP_ADMIN, DIRECTOR, ADMIN, DEPUTY, SAFEGUARDING,
                    NURSE, FINANCE, ACCOUNTANT, HR, IT_ADMIN, AUDITOR -> true;
            default -> false;
        };
    }

    public boolean isPrivileged() {
        return requiresMfa();
    }
}
