# PART13 — Guardian / Parent portal audit (PROMPT 005, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 005 (guardian / *responsables légaux* portal) in `SMS_SOF`.  
**Status:** Evidence-based baseline. What exists, what is broken, what is a stub, and the plan followed for P1–P4. It is **not** a production-readiness claim.

## 0. Method and evidence sources

Read/audited in this session:

- **Contract:** `AGENTS.md`, `docs/PART12_PLATFORM_FOUNDATIONS.md`, `docs/PART11_FINANCE_AUDIT.md`, `docs/COMPLIANCE.md`, `docs/DECISIONS.md`, `docs/ROLE_UI_MAP.md`, `docs/SECURITY_REVIEW_CHECKLIST.md`, `verify/features.yaml`.
- **Shared model:** `packages/shared/src/{types,roles,demo-seed,access/*}.ts`.
- **API client + mock:** `packages/api-client/src/{client,queries,http,env}.ts`, `mock/{adapter,db}.ts`.
- **Web:** `apps/web/src/App.tsx`, `app/nav.ts`, `app/session.tsx`, `access/*`, `components/{AppShell,Screen}.tsx`, `pages/{Dashboards,Attendance,Timetable,Communication,Activities,Settings,People}.tsx`, `test/*`.
- **API:** `services/api/src/main/java/com/schoolos/{people,security,common}`, `src/main/resources/db/migration/V1..V6`, `src/test/java/**/ParentScopeTest`, `CrossTenantIsolationTest`.
- **BFF:** `services/bff/src/{server,session,config}.js`, `identity/{demo-accounts,roles}.js`.
- **Tests/verify:** `apps/web/e2e/{smoke,analytics,performance}.spec.ts`, `scripts/verify-all.sh`, `verify/runner.py`.

Environment note: Docker/PostgreSQL are **not running** in this session, so DB-backed checks and `verify-all` environment groups were not executed here. Compilation (`./gradlew compileJava`), TypeScript, Vitest and Playwright (mock mode) were used as the executable evidence.

## 1. What exists

| Area | Status | Evidence |
|---|---|---|
| Role model includes family roles | **Exists** | `DISPLAY_ROLES` has `guardian`, `guardian2`, `parent`; `toDisplayRole` maps BFF `GUARDIAN` to display `parent`; `ROLE_FAMILY` marks them `family`. |
| Guardian↔child row scope in API | **Partial but real** | `guardian_child` table with forced RLS (`V5__auth_guardian_scope.sql`), `GuardianChild`, `StudentAccessService`, `StudentService.get()` → `AccessDeniedException`; `ParentScopeTest` covers linked/unlinked children, another guardian, student self, staff. |
| Guardian child ids in BFF session | **Exists** | `services/bff/src/identity/demo-accounts.js` gives `guardian` (`Alex Moreau`) `childIds: ['stu-1','stu-2']` and `guardian2` (`Sarah Cohen`) `['stu-3']`; memberships carry `childIds`. |
| Demo sign-in for family | **Exists** | Login page lists demo accounts; `demo-guardian`, `demo-guardian-2` seeds in `packages/shared/src/demo-seed.ts` and `apps/web/src/demo/seed.ts`. |
| Family landing | **Broken / stub** | `/parent` renders `ParentDashboard` (`apps/web/src/pages/Dashboards.tsx:256`): two hard-coded stats, `students.data.slice(0,2)` — **all school students**, not the linked children — generic message/announcement lists. No `/family` route. |
| Family navigation | **Stub** | `ROLE_NAV_TREES.parent` (`packages/shared/src/access/routes.ts`) is almost entirely `/app/soon/parent/*` placeholders; attendance/grades/homework/documents/payments are unreachable. |
| Attendance / absences | **Staff-only** | `pages/Attendance.tsx` is a teacher register (`useAttendance`, `useSaveAttendance`). No guardian view, no declaration, no justification, no counters. |
| Timetable | **Generic, not child-scoped** | `pages/Timetable.tsx` + `mock` `timetable` render one global timetable; no child selector, changes, print or ICS. |
| Grades / bulletins | **Missing** | `SOON` placeholders only. No evaluations, bulletins, acknowledgment, chart. |
| Homework / cahier de textes | **Missing** | `nav.homework` → `/app/soon/parent/homework`. |
| Messaging | **Broken for family** | `pages/Communication.tsx` reads a global `Message[]` (`/v1/messages`) and sends `{to, subject, body}`; no threads, no office-hours policy, no attachments, no parent↔parent blocking, no retention. |
| Announcements / read receipts | **Partial** | Global list rendering `Announcement[]`; no audience targeting, no receipts, no ICS. |
| Forms / e-signature | **Missing** | `consent_record` soft model + `ConsentRecord` type; no templates, assignments, signature proof, signatory rules, revocation. |
| Authorized collectors | **Partial / wrong model** | `Guardian.custodyNotes` free text and `pickupAuthorised` boolean. No `authorized_person`, no approval workflow, no validity dates, no ID-check flag. |
| Appointments | **Missing** | No slots, booking, conflict detection, reminders. |
| Activities | **Partial** | Catalog/`enrolInActivity` exists (`pages/Activities.tsx`), mock returns `confirmed` only; no guardian eligibility, waitlist promotion, fees link, or consent. |
| Canteen | **Missing** | No menus, allergens, reservations, cutoff. |
| Billing for family | **Partial** | Invoices list + `payInvoice` exists; separate finance module per 004 is **not implemented in the repo** (finance routes are `soon`). No SEPA mandate, receipts, attestations, payer visibility. |
| Documents (certificat de scolarité…) | **Missing** | No generation, no request flow, no download history/watermarking. |
| Preferences / notifications | **Partial** | `Settings.tsx` is generic; notification preferences, quiet hours, digest, accessibility, device list and consent ledger are absent. |
| Data-subject requests | **Partial, staff-only** | `DataExportRequest` + `/v1/data-requests` are director/compliance screens; no guardian intake, no family scoping, no legal-exception explanation. |
| Concern reporting | **Wrong access model** | `/app/safeguarding/new` requires `safeguarding.write` (staff). A guardian cannot report a concern; requirement is write-only intake. |
| Help / emergency numbers | **Partial** | `/app/platform/support` is `platform.admin` only; no family help with 119 / 3020 / 3018. |
| Restrictions (court orders) | **Missing** | Only free-text `custodyNotes`; no typed restriction, scope, court document reference, effective dates, or enforcement. |
| Invitations / onboarding | **Partial** | BFF has invitation accept stub (`/auth/invitations/accept`) and members invitation screens for staff. No guardian invitation (single-use token, expiry, PIN, pupil-data verification, school confirmation). |
| Link revocation → session invalidation | **Missing** | No `guardian_link` status/version; sessions are not invalidated on relationship change. |
| Audit of guardian actions | **Missing** | Audit list is global mock; no guardian login, signature, download, restriction events. |
| Accessibility / performance | **Unknown / partial** | Shared UI kit has focus rings and reduced-motion tokens; no guardian-flow screen-reader evidence, no dashboard request budget. |
| Security tests (IDOR) | **Partial** | `ParentScopeTest` covers the student resource only; no child-scoped family endpoints exist to test. |

## 2. Legal/domain gaps (why the UI cannot simply reuse staff screens)

1. **No relationship model.** `guardian_child` has only `relationship`; missing parental authority, right to information, financial payer, emergency priority, may-collect, residence, validity, status.
2. **No restrictions.** A court order cannot be represented, so it cannot be enforced on portal, notifications, ICS, exports or pick-up lists.
3. **No signatory rules.** Forms cannot require one guardian / both guardians / legal representative only.
4. **No separated-parents semantics.** Nothing prevents one parent's data from leaking to the other, and nothing guarantees both receive school information. Nothing relays messages between parents (good) but nothing documents/enforces it.
5. **No age-of-majority policy** (continue read / student consent / stop).
6. **Consent is a boolean.** No versioned proof, no withdrawal with immediate effect, no legal-basis distinction (the portal's core processing must rest on contract/public-task/legal obligation, not consent).
7. **No notification policy.** No mandatory-notice list, no content-free push/email text, no quiet hours.

## 3. Defects found (P0 → fixed in P1/P2)

| # | Defect | Severity | Fix in this work |
|---|---|---|---|
| D1 | Guardian dashboard shows **all** students of the school (`students.data.slice(0,2)`) instead of linked children | **Critical (IDOR-flavoured data leak in UI)** | Child-scoped family API (`/v1/family/*`) + dashboard built only from linked children; test asserts no unlinked child renders. |
| D2 | Guardian nav is placeholder-only; canonical landing is not a family portal | High | `/family/*` route tree, real navigation (FR), `/parent` redirects to `/family`. |
| D3 | No restriction model; court orders unenforceable | **Critical legal** | `guardian_restriction` (typed, scoped, document ref, dates); shared + server enforcement, audited; tests per scope. |
| D4 | Guardian cannot report a safety concern | High | `/family/concerns` write-only intake routed to direction + safeguarding; no read-back. |
| D5 | Staff safeguarding screens reachable in nav for family | High | Family nav is deny-by-default; route registry restricts `/app/safeguarding*` to staff roles; e2e asserts 403. |
| D6 | Invitations have no single-use/expiry/PIN semantics for guardians | High | `guardian_invitation` lifecycle: single use, expiry, attempts lockout, school confirmation; tests. |
| D7 | Guardian demo accounts do not match documented demo (`Famille Martin`, `Alex Moreau`) | Medium | Seed/BFF aligned: `Famille Martin` (guardian), `Alex Moreau` (guardian2) linked to Tom Martin; separated scenario + restriction. |
| D8 | No audit for family actions | High | Family service writes audit entries for login/link change/signature/download/restriction/collector. |
| D9 | `consent_record` cannot express proof/withdrawal | High | `consent_record` extended: version, purpose, legal basis, proof hash, withdrawn_at; revocation immediate. |
| D10 | `payInvoice` immediately marks paid, no step-up, no receipt | High (financial) | Family payment endpoint requires step-up, records PSP receipt, never mutates invoice without authorisation; split-payer visibility enforced. |
| D11 | No child-scoped IDOR tests for family endpoints | High | `GuardianPortalScopeTest` + `GuardianPolicyTest` (API), Playwright separated-parent scenario. |
| D12 | ICS/push/email could carry sensitive reasons | Medium | Tokenized revocable ICS feeds with generic titles; notification body scrub function + tests. |

## 4. Plan executed (phases, one commit each)

- **P0** — this audit.
- **P1** — relationship model (`guardian_link`, `guardian_restriction`, `authorized_person`, invitations), shared policy engine, restrictions, session re-check, seed with separated scenario.
- **P2** — G1–G9 (dashboard, child profile, attendance, timetable, homework, grades/bulletins, messaging, announcements, forms/e-sign).
- **P3** — G10–G20 (collectors, appointments, activities, canteen, billing, documents, preferences, data rights, concerns, help, notifications).
- **P4** — Playwright spec, `verify/features.yaml` rows, docs, `COMPLIANCE`/`DECISIONS` updates, final status table.

## 5. Legal items that stay **open** (needs humans)

See §9 of the prompt and `docs/PART13_GUARDIAN_REPORT.md` "Blockers". Every legal text in the product is rendered with a `TODO(legal-review)` marker.
