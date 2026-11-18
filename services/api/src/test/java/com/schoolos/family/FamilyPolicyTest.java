package com.schoolos.family;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class FamilyPolicyTest {

    private static final LocalDate TODAY = LocalDate.parse("2026-11-18");
    private static final UUID STU_1 = UUID.fromString("11111111-1111-4111-8111-111111111101");
    private static final UUID STU_2 = UUID.fromString("11111111-1111-4111-8111-111111111102");

    @Test
    void activeLinksRespectStatusAndValidity() {
        FamilyPolicy.GuardianLink active = link("demo-guardian", STU_2, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.GuardianLink revoked = link("demo-guardian-2", STU_2, true, "revoked", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.GuardianLink future = link("demo-guardian-3", STU_2, true, "active", LocalDate.parse("2026-12-01"), null);

        assertThat(FamilyPolicy.isLinkActive(active, TODAY)).isTrue();
        assertThat(FamilyPolicy.isLinkActive(revoked, TODAY)).isFalse();
        assertThat(FamilyPolicy.isLinkActive(future, TODAY)).isFalse();
        assertThat(FamilyPolicy.activeLinks(List.of(active, revoked, future), TODAY)).containsExactly(active);
    }

    @Test
    void restrictionsBlockOnlyTheirDataClass() {
        FamilyPolicy.Restriction collect = restriction(STU_2, "demo-guardian-2", "collect_child");
        FamilyPolicy.Restriction media = restriction(STU_2, "demo-guardian-2", "media");

        assertThat(FamilyPolicy.restrictionBlocks(List.of(collect, media), FamilyPolicy.DataClass.COLLECTION, TODAY)).isTrue();
        assertThat(FamilyPolicy.restrictionBlocks(List.of(collect, media), FamilyPolicy.DataClass.MEDIA, TODAY)).isTrue();
        assertThat(FamilyPolicy.restrictionBlocks(List.of(collect, media), FamilyPolicy.DataClass.INFORMATION, TODAY)).isFalse();
        assertThat(FamilyPolicy.restrictionBlocks(List.of(collect, media), FamilyPolicy.DataClass.RECORDS, TODAY)).isFalse();
        assertThat(FamilyPolicy.restrictionBlocks(List.of(restriction(STU_2, "demo-guardian-2", "school_information")),
                FamilyPolicy.DataClass.RECORDS, TODAY)).isTrue();
    }

    @Test
    void bothGuardiansRequiresAuthorityAndNeverInfersSecondParent() {
        FamilyPolicy.GuardianLink g1 = link("demo-guardian", STU_1, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.GuardianLink g1Tom = link("demo-guardian", STU_2, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.GuardianLink g2Tom = link("demo-guardian-2", STU_2, true, "active", LocalDate.parse("2026-01-01"), null);

        assertThat(FamilyPolicy.requiredSignatories("both_guardians", List.of(g1), TODAY, STU_1))
                .containsExactly("demo-guardian");
        assertThat(FamilyPolicy.requiredSignatories("both_guardians", List.of(g1Tom, g2Tom), TODAY, STU_2))
                .containsExactlyInAnyOrder("demo-guardian", "demo-guardian-2");
    }

    @Test
    void oneGuardianAllowsEitherEligibleAndCompletesAfterOneSignature() {
        FamilyPolicy.GuardianLink g1 = link("demo-guardian", STU_1, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.GuardianLink g2 = link("demo-guardian-2", STU_1, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.FormAssignment unsigned = new FamilyPolicy.FormAssignment(
                "fa-2", STU_1, "Droit à l’image", "image_rights", "one_guardian", "pending",
                List.of("demo-guardian", "demo-guardian-2"), List.of(), true);

        FamilyPolicy.SignState first = FamilyPolicy.signState(unsigned, "demo-guardian", List.of(g1, g2), List.of(), TODAY);
        assertThat(first.allowed()).isTrue();
        assertThat(first.reason()).isEqualTo("ok");

        FamilyPolicy.FormAssignment signed = new FamilyPolicy.FormAssignment(
                "fa-2", STU_1, "Droit à l’image", "image_rights", "one_guardian", "signed",
                List.of("demo-guardian", "demo-guardian-2"),
                List.of(new FamilyPolicy.Signature("demo-guardian", "Camille", Instant.parse("2026-11-17T10:00:00Z"))), true);
        FamilyPolicy.SignState complete = FamilyPolicy.signState(signed, "demo-guardian-2", List.of(g1, g2), List.of(), TODAY);
        assertThat(complete.allowed()).isFalse();
        assertThat(complete.reason()).isIn("complete", "already_signed", "not_eligible");
    }

    @Test
    void informationRestrictionBlocksSigning() {
        FamilyPolicy.GuardianLink g2 = link("demo-guardian-2", STU_2, true, "active", LocalDate.parse("2026-01-01"), null);
        FamilyPolicy.Restriction info = restriction(STU_2, "demo-guardian-2", "school_information");
        FamilyPolicy.FormAssignment form = new FamilyPolicy.FormAssignment(
                "fa-4", STU_2, "Sortie", "trip", "both_guardians", "pending",
                List.of("demo-guardian", "demo-guardian-2"), List.of(), false);

        FamilyPolicy.SignState state = FamilyPolicy.signState(form, "demo-guardian-2", List.of(g2), List.of(info), TODAY);
        assertThat(state.allowed()).isFalse();
        assertThat(state.reason()).isEqualTo("restricted");
    }

    @Test
    void majorityAccessFollowsSchoolPolicy() {
        FamilyPolicy.PolicyConfig requireConsent = new FamilyPolicy.PolicyConfig(
                "require_student_consent", "school", false, true, 4, 3, "label", "TODO(legal-review)");
        FamilyPolicy.PolicyConfig stop = new FamilyPolicy.PolicyConfig(
                "stop", "school", false, true, 4, 3, "label", "TODO(legal-review)");

        assertThat(FamilyPolicy.ageAt(LocalDate.parse("2008-11-18"), TODAY)).isEqualTo(18);
        assertThat(FamilyPolicy.majorityAccess(LocalDate.parse("2008-11-19"), TODAY, requireConsent)).isEqualTo("full");
        assertThat(FamilyPolicy.majorityAccess(LocalDate.parse("2008-11-18"), TODAY, requireConsent)).isEqualTo("consent_required");
        assertThat(FamilyPolicy.majorityAccess(LocalDate.parse("2008-11-18"), TODAY, stop)).isEqualTo("stopped");
    }

    @Test
    void safeNotificationsAndMessagingRules() {
        for (String category : List.of("attendance", "grades", "billing", "safety")) {
            FamilyPolicy.NotificationText text = FamilyPolicy.safeNotificationText(category);
            assertThat(text.title()).doesNotContain("Léa", "Tom", "Martin", "€");
            assertThat(text.body()).doesNotContain("Léa", "Tom", "Martin", "€");
        }
        assertThat(FamilyPolicy.isAllowedMessageRecipient("teacher")).isTrue();
        assertThat(FamilyPolicy.isAllowedMessageRecipient("guardian")).isFalse();
        assertThat(FamilyPolicy.isAllowedMessageRecipient("parent")).isFalse();
    }

    @Test
    void canteenCutoffAndConsentHelpers() {
        assertThat(FamilyPolicy.canteenOrderOpen(LocalDate.parse("2026-11-19"), LocalDateTime.parse("2026-11-19T09:00:00"), 10)).isTrue();
        assertThat(FamilyPolicy.canteenOrderOpen(LocalDate.parse("2026-11-19"), LocalDateTime.parse("2026-11-19T10:00:00"), 10)).isFalse();
        assertThat(FamilyPolicy.canWithdrawConsent("consent", true, null)).isTrue();
        assertThat(FamilyPolicy.canWithdrawConsent("legal_obligation", true, null)).isFalse();
    }

    @Test
    void guardianContactMaskingRespectsAddressRestriction() {
        FamilyPolicy.Restriction address = restriction(STU_2, "demo-guardian-2", "address_disclosure");
        Map<String, Object> masked = FamilyPolicy.guardianContact("Alex Moreau", "alex.moreau@example.fr", "0612345678", List.of(address), TODAY);
        assertThat(masked.get("masked")).isEqualTo(true);
        assertThat(String.valueOf(masked.get("email"))).doesNotContain("alex.moreau");
        assertThat(String.valueOf(masked.get("phone"))).contains("••••");
        Map<String, Object> clear = FamilyPolicy.guardianContact("Alex Moreau", "alex.moreau@example.fr", "0612345678", List.of(), TODAY);
        assertThat(clear.get("masked")).isEqualTo(false);
    }

    private static FamilyPolicy.GuardianLink link(String sub, UUID childId, boolean authority, String status,
                                                  LocalDate from, LocalDate to) {
        return new FamilyPolicy.GuardianLink(sub, sub, sub + "@example.fr", childId, authority, true, false, false, true,
                status, from, to, null);
    }

    private static FamilyPolicy.Restriction restriction(UUID childId, String sub, String type) {
        return new FamilyPolicy.Restriction("r-" + type, childId, sub, type, "test", "TJ-0", true,
                LocalDate.parse("2026-01-01"), null, "note");
    }
}
