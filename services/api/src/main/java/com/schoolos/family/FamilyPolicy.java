package com.schoolos.family;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Server-side guardian policy engine. Mirrors {@code packages/shared/src/family/policy.ts};
 * both are tested independently so a change on one side cannot silently weaken the other.
 *
 * Pure functions only: no Spring, no database, no request state. Custody is never inferred —
 * only explicit guardian_child flags and court-order restrictions are read.
 */
public final class FamilyPolicy {

    private FamilyPolicy() {}

    public enum DataClass { INFORMATION, RECORDS, MEDIA, COLLECTION, CONTACT, ADDRESS }

    public record GuardianLink(
            String guardianSub,
            String guardianName,
            String guardianEmail,
            java.util.UUID childId,
            boolean holdsParentalAuthority,
            boolean rightToInformation,
            boolean financialPayer,
            boolean emergencyContact,
            boolean mayCollectChild,
            String status,
            LocalDate validFrom,
            LocalDate validTo,
            String revokedReason) {
    }

    public record Restriction(
            String id,
            java.util.UUID childId,
            String guardianSub,
            String type,
            String scope,
            String courtDocumentRef,
            boolean active,
            LocalDate effectiveFrom,
            LocalDate effectiveTo,
            String note) {
    }

    public record Signature(String signerSub, String signerName, java.time.Instant signedAt) {
    }

    public record FormAssignment(
            String id,
            java.util.UUID childId,
            String title,
            String formType,
            String signatoryRule,
            String status,
            List<String> requiredSignerSubs,
            List<Signature> signatures,
            boolean withdrawable) {
    }

    public record SignState(boolean allowed, String reason, List<String> awaiting, String label) {
    }

    public record PolicyConfig(
            String agePolicy,
            String canteenMode,
            boolean gradeRankingEnabled,
            boolean bothGuardiansMeetingDefault,
            int absenceThresholdUnjustified,
            int absenceThresholdLate,
            String absenceThresholdLabel,
            String signatureNotice) {
    }

    public record NotificationText(String title, String body) {
    }

    private static final Map<String, Set<DataClass>> BLOCKED_BY = Map.of(
            "school_information", Set.of(DataClass.INFORMATION, DataClass.RECORDS, DataClass.MEDIA),
            "records", Set.of(DataClass.RECORDS),
            "media", Set.of(DataClass.MEDIA),
            "collect_child", Set.of(DataClass.COLLECTION),
            "contact_with_child", Set.of(DataClass.CONTACT),
            "address_disclosure", Set.of(DataClass.ADDRESS));

    /** Form type → signatory rule. Configurable in family_policy_config; this is the safe default. */
    public static final Map<String, String> DEFAULT_SIGNATORY_RULES = Map.ofEntries(
            Map.entry("trip", "both_guardians"),
            Map.entry("outing", "both_guardians"),
            Map.entry("autonomous_departure", "both_guardians"),
            Map.entry("image_rights", "one_guardian"),
            Map.entry("activity_registration", "one_guardian"),
            Map.entry("rules_acceptance", "legal_representative_only"),
            Map.entry("contract", "legal_representative_only"),
            Map.entry("health_document", "legal_representative_only"),
            Map.entry("custom", "one_guardian"));

    private static final Set<String> ALLOWED_MESSAGE_RECIPIENTS =
            Set.of("teacher", "school_life", "direction", "nurse", "librarian");

    private static final Map<String, NotificationText> SAFE_NOTIFICATIONS = Map.ofEntries(
            Map.entry("attendance", new NotificationText("Information de présence",
                    "Une nouvelle information de présence est disponible dans votre espace famille.")),
            Map.entry("grades", new NotificationText("Nouveau résultat scolaire",
                    "Un nouveau document scolaire est disponible dans votre espace famille.")),
            Map.entry("messages", new NotificationText("Nouveau message",
                    "Vous avez reçu un message de l’établissement.")),
            Map.entry("announcements", new NotificationText("Nouvelle annonce",
                    "Une annonce de l’établissement est disponible.")),
            Map.entry("forms", new NotificationText("Document à compléter",
                    "Un formulaire attend votre signature dans votre espace famille.")),
            Map.entry("appointments", new NotificationText("Rendez-vous",
                    "Un changement concerne un rendez-vous à venir.")),
            Map.entry("activities", new NotificationText("Activités",
                    "Une information concerne une activité périscolaire.")),
            Map.entry("billing", new NotificationText("Facturation",
                    "Une nouvelle information de facturation est disponible.")),
            Map.entry("documents", new NotificationText("Document disponible",
                    "Un document est disponible au téléchargement dans votre espace famille.")),
            Map.entry("safety", new NotificationText("Message important de l’établissement",
                    "Consultez votre espace famille ou contactez la direction.")));

    public static boolean isLinkActive(GuardianLink link, LocalDate today) {
        if (!"active".equalsIgnoreCase(link.status())) return false;
        if (link.validFrom() != null && today.isBefore(link.validFrom())) return false;
        return link.validTo() == null || !today.isAfter(link.validTo());
    }

    public static List<GuardianLink> activeLinks(List<GuardianLink> links, LocalDate today) {
        return links.stream().filter(link -> isLinkActive(link, today)).toList();
    }

    public static List<Restriction> effectiveRestrictions(List<Restriction> restrictions, LocalDate today) {
        return restrictions.stream().filter(restriction -> {
            if (!restriction.active()) return false;
            if (today.isBefore(restriction.effectiveFrom())) return false;
            return restriction.effectiveTo() == null || !today.isAfter(restriction.effectiveTo());
        }).toList();
    }

    /** A restriction denies its data class only; everything not listed stays visible. */
    public static boolean restrictionBlocks(List<Restriction> restrictions, DataClass dataClass, LocalDate today) {
        Set<DataClass> blocked = Set.of();
        for (Restriction restriction : effectiveRestrictions(restrictions, today)) {
            blocked = BLOCKED_BY.getOrDefault(restriction.type(), Set.of());
            if (blocked.contains(dataClass)) return true;
        }
        return false;
    }

    public static Restriction blockingRestriction(List<Restriction> restrictions, DataClass dataClass, LocalDate today) {
        return effectiveRestrictions(restrictions, today).stream()
                .filter(restriction -> BLOCKED_BY.getOrDefault(restriction.type(), Set.of()).contains(dataClass))
                .findFirst().orElse(null);
    }

    public static List<String> requiredSignatories(
            String mode, List<GuardianLink> links, LocalDate today, java.util.UUID childId) {
        List<GuardianLink> eligible = activeLinks(links, today).stream()
                .filter(link -> link.childId().equals(childId)).toList();
        LinkedHashSet<String> subs = new LinkedHashSet<>();
        if ("one_guardian".equals(mode)) {
            eligible.stream()
                    .filter(link -> link.holdsParentalAuthority() || link.rightToInformation())
                    .forEach(link -> subs.add(link.guardianSub()));
            return List.copyOf(subs);
        }
        eligible.stream().filter(GuardianLink::holdsParentalAuthority)
                .forEach(link -> subs.add(link.guardianSub()));
        return List.copyOf(subs);
    }

    public static SignState signState(
            FormAssignment assignment,
            String guardianSub,
            List<GuardianLink> links,
            List<Restriction> restrictions,
            LocalDate today) {

        List<String> required = assignment.requiredSignerSubs() == null ? List.of() : assignment.requiredSignerSubs();
        List<String> signed = assignment.signatures() == null ? List.of()
                : assignment.signatures().stream().map(Signature::signerSub).toList();
        List<String> eligibleSubs = requiredSignatories(assignment.signatoryRule(), links, today, assignment.childId());
        boolean oneGuardian = "one_guardian".equals(assignment.signatoryRule());
        boolean complete = oneGuardian
                ? signed.stream().anyMatch(eligibleSubs::contains)
                : !required.isEmpty() && required.stream().allMatch(signed::contains);

        List<String> awaiting = new ArrayList<>();
        if (oneGuardian) {
            if (!complete) eligibleSubs.stream().filter(sub -> !signed.contains(sub)).forEach(awaiting::add);
        } else {
            required.stream().filter(sub -> !signed.contains(sub)).forEach(awaiting::add);
        }
        boolean eligible = oneGuardian ? eligibleSubs.contains(guardianSub) : required.contains(guardianSub);

        if ("withdrawn".equals(assignment.status())) {
            return new SignState(false, "withdrawn", awaiting, "awaiting_other");
        }
        if (complete || "signed".equals(assignment.status())) {
            return new SignState(false, "complete", List.of(), "complete");
        }
        if (!eligible) {
            return new SignState(false, "not_eligible", awaiting, "not_eligible");
        }
        if (signed.contains(guardianSub)) {
            return new SignState(false, "already_signed", awaiting, "awaiting_other");
        }
        if (restrictionBlocks(restrictions, DataClass.INFORMATION, today)) {
            return new SignState(false, "restricted", awaiting, "awaiting_you");
        }
        if ("declined".equals(assignment.status())) {
            return new SignState(false, "rule_unsatisfied", awaiting, "awaiting_you");
        }
        boolean linked = activeLinks(links, today).stream()
                .anyMatch(link -> link.childId().equals(assignment.childId())
                        && link.guardianSub().equals(guardianSub));
        if (!linked) {
            return new SignState(false, "not_eligible", awaiting, "not_eligible");
        }
        return new SignState(true, "ok", awaiting, "awaiting_you");
    }

    /* -------------------------------------------------------------- age */

    public static int ageAt(LocalDate birthDate, LocalDate today) {
        return (int) ChronoUnit.YEARS.between(birthDate, today);
    }

    /** full | consent_required | stopped */
    public static String majorityAccess(LocalDate birthDate, LocalDate today, PolicyConfig policy) {
        if (birthDate == null) return "full";
        if (ageAt(birthDate, today) < 18) return "full";
        if ("continue_read".equals(policy.agePolicy())) return "full";
        if ("stop".equals(policy.agePolicy())) return "stopped";
        return "consent_required";
    }

    /* -------------------------------------------------------------- notifications */

    public static NotificationText safeNotificationText(String category) {
        return SAFE_NOTIFICATIONS.getOrDefault(category,
                new NotificationText("Information de l’établissement",
                        "Une nouvelle information est disponible dans votre espace famille."));
    }

    public static boolean isMandatoryNotification(String category) {
        return Set.of("safety", "attendance", "forms", "announcements").contains(category);
    }

    public static boolean channelAllowed(boolean mandatory, boolean email, boolean push, String channel) {
        if (mandatory) return true;
        if ("in_app".equals(channel)) return true;
        return "email".equals(channel) ? email : push;
    }

    /* -------------------------------------------------------------- ICS */

    public static String icsTitle(String subject, String changeKind) {
        if (changeKind == null || changeKind.isBlank()) return subject;
        return switch (changeKind) {
            case "trip" -> "Sortie scolaire";
            case "cancelled" -> "Cours annulé";
            case "replacement" -> "Cours remplacé";
            case "room_change" -> "Changement de salle";
            default -> "Emploi du temps modifié";
        };
    }

    public static String icsDescription(String changeKind) {
        return changeKind == null || changeKind.isBlank()
                ? "Emploi du temps — détails sur le portail."
                : "Modification de l’emploi du temps — détails sur le portail.";
    }

    /* -------------------------------------------------------------- messaging */

    /** The portal never relays parent-to-parent messages: only staff recipients are allowed. */
    public static boolean isAllowedMessageRecipient(String recipientRole) {
        return recipientRole != null && ALLOWED_MESSAGE_RECIPIENTS.contains(recipientRole);
    }

    public static boolean quietHoursActive(LocalTime start, LocalTime end, LocalDateTime now, boolean enabled) {
        if (!enabled) return false;
        LocalTime current = now.toLocalTime();
        return start.isAfter(end)
                ? !current.isBefore(start) || current.isBefore(end)
                : !current.isBefore(start) && current.isBefore(end);
    }

    /* -------------------------------------------------------------- canteen */

    public static boolean canteenOrderOpen(LocalDate mealDate, LocalDateTime now, int cutoffHour) {
        LocalDateTime cutoff = mealDate.atTime(cutoffHour, 0);
        return now.isBefore(cutoff);
    }

    /* -------------------------------------------------------------- privacy */

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "—";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        return local.substring(0, Math.min(1, local.length()))
                + "•".repeat(Math.max(3, local.length() - 1)) + "@" + domain;
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) return "—";
        return phone.substring(0, 4) + "••••" + phone.substring(phone.length() - 2);
    }

    public static Map<String, Object> guardianContact(
            String name, String email, String phone, List<Restriction> restrictions, LocalDate today) {
        boolean masked = restrictionBlocks(restrictions, DataClass.ADDRESS, today);
        return Map.of(
                "name", name == null ? "—" : name,
                "email", masked ? maskEmail(email) : (email == null ? "—" : email),
                "phone", masked ? maskPhone(phone) : (phone == null ? "—" : phone),
                "masked", masked);
    }

    /* -------------------------------------------------------------- consent */

    public static boolean consentIsActive(String legalBasis, boolean granted, java.time.Instant withdrawnAt) {
        return "consent".equals(legalBasis) ? granted && withdrawnAt == null : granted;
    }

    public static boolean canWithdrawConsent(String legalBasis, boolean granted, java.time.Instant withdrawnAt) {
        return "consent".equals(legalBasis) && granted && withdrawnAt == null;
    }

    public static java.time.Instant endOfDay(LocalDate date) {
        return date.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }
}
