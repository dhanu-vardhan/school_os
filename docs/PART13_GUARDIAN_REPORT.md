# PART13 — Guardian / Parent portal report (PROMPT 005)

**Date:** 2026-11-18  
**Scope:** PROMPT 005 guardian / *responsables légaux* portal (`/family`, G1–G20) in `SMS_SOF` (SchoolOS).  
**Status:** **P0–P3 web/shared/mock and P4 verification/docs partially complete; Java backend/API implementation started but not fully integrated/verified against a migrated DB.** This is **not** a production-readiness claim.

## 1. What was delivered

### P0 — Audit (`docs/PART13_GUARDIAN_AUDIT.md`)
- Evidence-based baseline of existing guardian/parent surfaces, routing, permissions, mock/API gaps, data model, and defects (D1–D12) with an implementation plan and explicit human/legal open items.

### P1 — Shared domain, policy, fixtures, routing, permissions, BFF/demo alignment (web/mock)
- **Shared family domain:** `packages/shared/src/family/{types.ts,policy.ts,seed.ts,index.ts}` exported via shared root; `DemoData.family` added.
- **Pure policy engine (parity target):** active-link checks, effective restrictions by explicit type/scope only (no custody inference), `restrictionBlocks` per data class, signatory derivation and `signState` (including `one_guardian` re-derived from active links), 18-year access policy helpers, safe/content-free notification text, allowed message recipients (no guardian↔guardian relay), canteen cutoff, consent withdrawal helpers, contact masking, ICS helpers.
- **Fixtures:** Famille Martin (`demo-guardian`, stu-1 Léa MS A + stu-2 Tom CP A), Alex Moreau (`demo-guardian-2`, stu-2 separated with `collect_child` + `media` restrictions), Famille Petit (`demo-guardian-petit`, stu-5/stu-9) for IDOR, pending/expired invitations, linked forms/billing/attendance/homework/grades/threads/announcements/activities/canteen/documents/consents/preferences/devices/data requests/ICS/concerns per seed.
- **Access & navigation:** canonical guardian landing `/family`; `/family/*` routes in `ROUTE_REGISTRY` with `allowedRoles: ['parent']` and family permissions; `/parent` legacy redirect; real FR nav in `AppShell`/route tree; `nav.children` labeled “Mes enfants” / “My children”.
- **Permissions:** `family.read`, `family.write`, `family.pay` (and related family capabilities) granted to guardian roles in shared access model; denied to non-guardian roles.

### P2–P3 — UI, stateful mock, API client (G1–G20)
- **API client:** `packages/api-client/src/family.ts`, `queries.ts`, `mock/family.ts`, `mock/adapter.ts`, `mock/db.ts` wiring. Mock is stateful, derives guardian/tenant scope from session (never request body), enforces child scope/restrictions/signatory/step-up/consent/ICS behaviors for covered flows.
- **Web UI:** `apps/web/src/family/{context.tsx,FamilyLayout.tsx,components.tsx}` and pages for G1–G20 (Accueil/dashboard, Mes enfants, Présences & absences, Emploi du temps, Devoirs, Notes & bulletins, Messages, Annonces, Autorisations & formulaires, Rendez-vous, Activités, Restauration, Facturation, Documents, Profil & préférences, Aide; plus related flows: ICS, collectors, concerns, invitations/state handling as surfaced). Routes mounted in `apps/web/src/App.tsx`.
- **BFF/demo identity alignment (web/mock):** `demoLogin('guardian')` → Famille Martin (`demo-guardian`, stu-1, stu-2); `demoLogin('guardian2')` → Alex Moreau (`demo-guardian-2`, stu-2). Mock step-up refreshes `stepUpUntil` on current session.

### P4 — Tests, verification, backend start
- **Web tests:** `apps/web/src/test/{family-policy.test.ts,family-api.test.ts,guardian-portal.test.tsx}` present/updated. `pnpm --filter @schoolos/web typecheck` passes; `pnpm --filter @schoolos/web test` → **165 passed (15 files)**.
- **Playwright:** `apps/web/e2e/guardian.spec.ts` added — targeted run `pnpm exec playwright test e2e/guardian.spec.ts` → **5 passed, 5 skipped** (mobile skipped by spec).
- **Java backend (started):** `V7__guardian_portal.sql` (tenant-scoped forced-RLS schema, grants, append-only/immutable intent for signature/receipt/audit tables), `com.schoolos.family.{FamilyPolicy,FamilyService,FamilyController}` implemented, `PolicyService` updated with `FAMILY_READ/WRITE/PAY` and guardian grants (`FAMILY_PAY` sensitive/step-up), `GuardianChild`/`GuardianChildRepository`/`StudentAccessService` aligned for active-link scope checks. `./gradlew compileJava compileTestJava` passes; `FamilyPolicyTest` (Java parity unit tests) passes.

## 2. G1–G20 status matrix

| ID | Capability | Status | Evidence / notes |
|---|---|---|---|
| G1 | Landing `/family` dashboard, child switcher, scoped cards/actions | **Implemented (web/mock)** | `FamilyLayout`/context + dashboard page; guardian e2e landing and no-other-family assertions pass. Backend endpoint implemented, not DB-verified end-to-end. |
| G2 | Mes enfants / child overview & contacts (restrictions respected) | **Implemented (web/mock)** | Child list/detail pages; child scope derived from session in mock/service. |
| G3 | Présences & absences (view + declaration flow) | **Implemented (web/mock), partial backend** | UI/mock flows and tests; Java service supports read/declare with scope checks and audit attempt, full parity/validation coverage pending. |
| G4 | Emploi du temps (timetable) | **Implemented (web/mock), partial backend** | Timetable view in UI/mock; backend read model present. |
| G5 | Devoirs (homework, read state) | **Implemented (web/mock), partial backend** | UI/mock and API contract; backend read/mark-read implemented. |
| G6 | Notes & bulletins (grades, acknowledgement/download as exposed) | **Implemented (web/mock), partial backend** | UI/mock; backend read/ack paths implemented, full parity pending. |
| G7 | Messages (staff recipients only, no parent↔parent relay) | **Implemented (web/mock), partial backend** | Mock/UI/tests enforce allowed recipients and forbid guardian relay; Java service checks `FamilyPolicy.isAllowedMessageRecipient`. Retention/rate-limit/abuse handling not fully governed. |
| G8 | Annonces (announcements, receipt/read) | **Implemented (web/mock), partial backend** | UI/mock and read endpoints. |
| G9 | Autorisations & formulaires (sign/withdraw, signatory rules, proof) | **Implemented (web/mock), partial backend** | One/both/legal-representative rules modeled in shared/mock; Java sign/withdraw implemented with eligibility checks and audit, full legal/proof parity and edge-case coverage pending DB-backed tests. |
| G10 | Rendez-vous (appointments) | **Implemented (web/mock), partial backend** | Booking/cancel flows in UI/mock/service. |
| G11 | Activités (activities/enrolments) | **Implemented (web/mock), partial backend** | List/enrol/cancel flows. |
| G12 | Restauration (canteen menus/reservations/cutoff) | **Implemented (web/mock), partial backend** | Reservation/cancel and cutoff logic in shared/mock; backend enforces cutoff helper. |
| G13 | Collecte/autorisations de sortie (authorized collectors) | **Implemented (web/mock), partial backend** | Add/update/remove flows; restrictions (e.g. `collect_child`) enforced in mock, full backend enforcement parity pending. |
| G14 | Facturation (split billing/payer visibility, step-up pay, receipts/mandate) | **Implemented (web/mock), partial backend** | Payer-scoped invoices in mock/service, `FAMILY_PAY` requires permission+step-up in service, receipt records; PSP/SEPA are demo-safe flows, not production payment integration. |
| G15 | Documents (list/request/download, watermark/audit intent) | **Implemented (web/mock), partial backend** | Mock returns watermarked download metadata and audits; Java download records watermark/audit and access checks, signed/expiring file delivery and storage integration pending. |
| G16 | Profil & préférences (notifications, devices, accessibility/language as surfaced) | **Implemented (web/mock), partial backend** | Preferences/devices read/write in UI/mock/service; content-free notification policy modeled in shared, full delivery channels/preferences enforcement pending. |
| G17 | Consentements (view/withdraw immediate for consent-based, proof) | **Implemented (web/mock), partial backend** | Shared/mock and API flows; Java withdraw checks consent basis and audits. |
| G18 | Demandes RGPD/données (data requests) | **Implemented (web/mock), partial backend** | Create/list flows scoped to guardian/child. |
| G19 | Aide / signalement (concern/help, routed safely) | **Implemented (web/mock), partial backend** | Concern submission scoped and audited in service/mock; safeguarding/escalation workflow integration pending. |
| G20 | Invitations, lien famille, restrictions, ICS, politique/contacts (cross-cutting) | **Implemented (web/mock), partial backend** | Invitation states, guardian contact masking/restrictions, revocable ICS token flows, policy exposure; Java implements core reads/actions but full lifecycle/integration tests pending. |

## 3. Security & privacy posture (implemented/started)

- **Server-derived identity/scope:** Java family service/controller derive guardian subject and accessible children from authenticated context and active `guardian_child` links; no `school_id` accepted from request. UI/mock also derive guardian from session.
- **Deny-by-default permissions:** `FAMILY_READ/WRITE/PAY` added to `PolicyService`; controller annotated with `@RequirePermission`; `FAMILY_PAY` treated as sensitive and requires active step-up.
- **IDOR intent:** child-scoped access checks in service (`requireChildAccess`/`scope`) for reads and mutations; mock tests cover key IDOR cases.
- **Court-order restrictions:** modeled by explicit flags/types in shared/mock/schema; Java reads active restrictions per child/guardian and policy helpers block by data class (full end-to-end enforcement across every response needs hardening/tests).
- **Signatures/receipts/audit:** V7 defines append-only/immutable tables for signatures/receipts/audit events; Java writes audit/signature/receipt records for covered actions (best-effort audit path in current service should be hardened to non-lossy in production).
- **Billing:** payer-scoped invoice visibility and step-up-gated payment flow (demo-safe).
- **Messaging:** guardian↔guardian relay rejected by policy.

## 4. Verification evidence

| Check | Result |
|---|---|
| `pnpm --filter @schoolos/web typecheck` | **PASS** |
| `pnpm --filter @schoolos/web test` | **PASS** (165 tests, 15 files) |
| `pnpm exec playwright test e2e/guardian.spec.ts` (web) | **PASS** (5 passed, 5 skipped) |
| `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew compileJava compileTestJava` | **PASS** |
| `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test --tests 'com.schoolos.family.FamilyPolicyTest'` | **PASS** |
| Java DB-backed/integration/security tests for family API | **Not run / pending** (requires migrated schema/data and auth/tenant test harness for `/api/v1/family/**`) |
| `verify/features.yaml` guardian entries / applicable `scripts/verify-all.sh` groups | **Updated for registry coverage; runner group execution not fully evidenced in this report** |
| Full Playwright suite | **Not fully re-run in this pass** |

## 5. Blockers, gaps, and follow-up

- **Backend integration:** `FamilyService`/`FamilyController` are implemented but need DB-backed verification against V7-migrated schema, seed/data alignment, and contract hardening to fully match mock/client shapes and edge cases (dashboard aggregates, bulletin/grade richness, notification prefs/devices parity, ICS feed retrieval semantics, invitation lifecycle actions, collector restriction enforcement, document signed URL delivery, etc.).
- **Security hardening/tests (required):** add and run DB-backed tests for IDOR on every child-scoped endpoint, revoked/suspended link → 403, restriction enforcement everywhere, signatory/both-guardians/one-guardian/legal-rep rules, invitation expiry/reuse/limits, consent revocation immediacy/proof, 18-year policy transitions, ICS token revocation/expiry, payer-only billing access, and audit event emission.
- **Rate limiting/abuse/retention:** messaging/concern rate limits, abuse handling, and retention notices/policies need governed backend enforcement (not just UI/mock).
- **Step-up freshness:** payment already gated by `FAMILY_PAY` + `stepUpActive()`; ensure BFF/API step-up claim semantics and UX are fully aligned for all sensitive family actions as required.
- **Unrelated in-flight work:** `/insights` dashboard changes remain untouched/uncommitted as instructed.

## 6. Open human/legal items (must not be marked complete)

- `TODO(legal-review)`: signatory rules and form/legal notices, consent texts/bases/wording, règlement/internal rules content, 18-year/majority access policy, mandatory notice content.
- Office-hours and mandatory-notice policy definition/validation.
- DPIA addendum for guardian portal processing (including restrictions, communications, documents, payments metadata, ICS, and minor/18+ transitions).
- Accessibility (a11y) audit.
- FR/EN translation review and copy sign-off.
- Any production payment/PSP, SEPA mandate, e-signature legal weight, and document storage/AV/signed-URL operations are **human/vendor/ops decisions** beyond this demo implementation.
