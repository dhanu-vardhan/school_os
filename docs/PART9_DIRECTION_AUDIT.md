# Part 9 — Direction audit (P0)

**Date:** 2026-11-18  
**Scope:** Director (`principal` / chef d’établissement), Deputy (`deputy` / direction adjointe), Teacher (relevant defects/T1–T9 dependencies).  
**Goal:** Evidence-based audit of what works, what is stubbed, and what is broken before P0–P5 implementation (PROMPT 002).

## 1. Method and sources reviewed

Mandatory context reviewed: `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/ROLE_UI_MAP.md`, `docs/FEATURE_PLAN.md`, `docs/GAP_REPORT.md`, `docs/FRONTEND_WIRING.md`, `docs/AUTH_DESIGN.md`, `docs/DEMO_ACCOUNTS.md`, `docs/AI_GOVERNANCE.md`, `docs/COMPLIANCE.md`, `verify/features.yaml`, and key implementation surfaces below.

Key code inspected:

- **Web routing/shell/session:** `apps/web/src/App.tsx`, `apps/web/src/app/nav.ts`, `apps/web/src/components/AppShell.tsx`, `apps/web/src/app/session.tsx`, `apps/web/src/access/{RouteGuard,states}.tsx`, `apps/web/src/pages/Dashboards.tsx`, `apps/web/src/components/Charts.tsx`.
- **Shared model:** `packages/shared/src/{brand,roles,demo-seed,access/{routes,landing,permissions,roles}}.ts`.
- **i18n:** `packages/i18n/src/locales/{fr,en}.ts`.
- **API client/mock:** `packages/api-client/src/{client,queries,mock/{adapter,db}}.ts`.
- **Demo seeds:** `packages/shared/src/demo-seed.ts`, `apps/web/src/demo/seed.ts`.
- **BFF:** `services/bff/src/{server,demo-users,identity/{demo-accounts,roles,oidc,passwords,totp}}.js`, `services/bff/test/*`.
- **API:** `services/api/src/main/java/com/schoolos/security/{PolicyService,PermissionInterceptor,RequirePermission,StepUpRequiredException}.java`, controllers in `analytics/people/tenancy/pedagogy`, migrations `V1__init.sql`–`V6__analytics.sql`, security/analytics tests.
- **Repo state:** pre-existing uncommitted changes `M apps/web/src/main.tsx`, `M services/api/src/main/java/com/schoolos/pedagogy/LessonPlan.java`, untracked `apps/web/src/dashboard/`, `docs/DASHBOARD_DESIGN.md` (**must be preserved**).

## 2. Current architecture (direction-relevant)

- **Role/landing model:** `packages/shared/src/access/routes.ts` defines canonical landings (`principal -> /principal`, `deputy -> /vie-scolaire`) and per-role nav trees via `ROLE_NAV_TREES` + `navGroupsForRole(...)`. `AppShell` (`apps/web/src/components/AppShell.tsx`) renders sidebar from `navGroupsForRole(displayToCanonical(role), ...)`; `apps/web/src/app/nav.ts` is a parallel legacy/nav config and is **not** the primary shell source for role landings — defect fixes and direction nav must target the shared route/nav registry and any actual consumers consistently.
- **Access enforcement (UI):** `RouteGuard` checks `findRoute` + `routeAccess` (tenant/role/permission/step-up/flag/impersonation) and renders `AccessDenied`/`TenantRequired`/`StepUpGate` in-shell without flashing content. Registry entries carry `allowedRoles`, `requiredPermissions`, `requiresStepUp`, `featureFlag`, `soon`.
- **Permission model (shared):** `packages/shared/src/roles.ts` provides `Permission` union, `rolePermissions` matrix, `can`/`canAccess`, `toDisplayRole`, `API_ROLE`. Deny-by-default at role level; object-scope checks rely on supplied resource/user fields. No delegation/approval primitives (`P`/`D`) exist.
- **Permission model (API):** `PolicyService` enforces a separate string-permission matrix with `require()` and step-up for sensitive permissions; `PermissionInterceptor` denies undeclared `com.schoolos` handlers (and requires `@RequirePermission`/`@PublicEndpoint`). Frontend permission names and backend permission names differ in places (e.g. dotted `students.read` vs `student.read`, `billing.read` vs `BILLING_READ`) — parity/mapping must be explicit.
- **BFF:** demo/OIDC session issuance, CSRF/origin checks, cookie session store, rate limiting/flooring, and API proxy (`/v1/*`) with server-derived session context (`services/bff/src/server.js`). Demo accounts/credentials are allow-listed in `services/bff/src/identity/demo-accounts.js` (+ `demo-users.js` façade). Director exists (`director` -> `DIRECTOR` on school A); **deputy demo account exists** but direction-specific permission claims/delegation/step-up scenarios for P0–P5 are not modeled.
- **Data/UI flow:** `packages/api-client` (`client.ts`, `queries.ts`) calls BFF paths; mock mode served by `mock/adapter.ts` over `mock/db.ts` seeded from `packages/shared/src/demo-seed.ts` (`makeDemoData`). Real API controllers are limited (analytics, students, schools, lesson planner) — no direction-operations domain yet.
- **Persistence:** Flyway `V1`–`V6` only (no direction operations/delegations/approvals tables). RLS/tenant binding patterns exist in earlier migrations/security infrastructure and must be preserved/extended, not weakened.
- **Verify registry:** `verify/features.yaml` marks `P1-5.1-roles` stubbed; `SCR-DIR-HOME`/`SCR-DIR-CLASSES` expected-working (UI-level) but lacks direction responsibility coverage; no deputy/teacher-scoping/defect-fix feature IDs yet.

## 3. Known defects (P0 #1–#8)

| # | Defect | Evidence (current state) | Impact |
|---|---|---|---|
| 1 | Raw i18n keys `nav.settings` / `nav.auditLog` in director sidebar | Principal nav tree uses `['nav.settings', '/app/school/settings', ...]` and `['nav.auditLog', '/app/compliance/audit', ...]` (`packages/shared/src/access/routes.ts` principal group). `packages/i18n/src/locales/{fr,en}.ts` define `common.settings` and `nav.audit` but **no** `nav.settings` / `nav.auditLog` keys. | Director sees untranslated keys in sidebar (and any other role using same keys). |
| 2 | English activity feed strings | `packages/shared/src/demo-seed.ts` notifications include English titles/bodies (`"Attendance recorded"`, `"New message"`, `"Activity waitlist"`, `"Invoice overdue"`). `AdminDashboard` renders `audit.data!.data.slice(0,4)` as timeline titles/descriptions (`apps/web/src/pages/Dashboards.tsx`, director/admin view), so FR UI shows EN feed items. | Broken FR experience / inconsistent locale. |
| 3 | "Effectif par niveau" bars not rendered | Director dashboard renders `<BarChart data={dashboard.data!.data.enrolmentByLevel} height={180} />` in a card (`Dashboards.tsx`) and mock dashboard provides `enrolmentByLevel: db.classes.map(c => ({ label: c.level, value: c.headcount }))` (`mock/adapter.ts`). `BarChart` (`apps/web/src/components/Charts.tsx`) renders flex bars from `value/max`; needs runtime verification but implementation is minimal and must be proven/fixed (layout/container/zero/max/data-shape issues possible). | KPI/chart promised by dashboard may appear empty/broken. |
| 4 | Teacher "Classes du jour" KPI/list scoping mismatch | `TeacherDashboard` computes `todayClasses` from full `timetable.data` filtered only by weekday and shows `classes.data!.data.slice(0,4)` unfiltered (`Dashboards.tsx`). No filtering by current teacher/session/class ownership. | Teacher can see other teachers’ classes/counts (data leakage/scope bug). |
| 5 | Only 2 quick tasks | `Frame` always renders `TopTasks` (Timetable + Attendance if `students.read`) for every dashboard (`Dashboards.tsx`); director/admin card "Actions rapides" adds 3 links but overall quick-task surface is thin and not aligned to D1–D17 responsibilities. | Direction cannot act on key tasks from home. |
| 6 | Brand inconsistency "Acadia" vs "SchoolOS" | `packages/shared/src/brand.ts` default `name: 'Acadia'`; `packages/i18n/src/locales/fr.ts` `app.name` is `Acadia` while UI chrome/routes/titles use `SchoolOS` (e.g. `App.tsx` document title, `AppShell`, access states). | Inconsistent product identity. |
| 7 | "Données partielles — certains modules ne sont pas encore disponibles" shown inappropriately | Banner string exists at `packages/i18n/src/locales/fr.ts:480` (`state.partial`). `PartialNotice`/mock notices are used in dashboards; must be removed or conditioned once direction modules are implemented (and not used as a blanket disclaimer). | Misleading UX once capabilities exist. |
| 8 | Seed not modeled as groupe scolaire (primaire+collège, 2 cycles/sites) | `packages/shared/src/demo-seed.ts` defines one active school A primary context with mixed primary/collège class labels in one list and a separate school B record; `apps/web/src/demo/seed.ts` models two sites differently (Primaire/Maternelle). Demo identities include multi-school parents but direction data is not coherently split by cycle/site with realistic handoffs. | Cannot validate direction responsibilities across cycles/sites. |

## 4. Director / chef d’établissement — current state

| Area | Status | Notes |
|---|---|---|
| Route/landing | **Works (UI shell)** | `/principal` canonical landing exists; `DashboardSwitch` renders admin/director-style dashboard for school/platform family. No dedicated `/director` alias beyond legacy `/app/dashboard/admin` alias handling in registry/app. |
| Navigation | **Broken (i18n) + partial** | Principal tree provides overview/insights/school groups but several items are `soon(...)` (`classes`, `approvals`) and visible labels include raw keys `nav.settings`, `nav.auditLog`; many D-responsibility destinations absent. |
| Dashboard/home | **Partial/broken** | KPI cards, trend, enrolment-by-level chart, alerts, audit feed, quick actions exist but depend on demo/mock data quality; defects #2/#3/#5/#7 apply. No direction operations (validations, substitutions, compliance deadlines, staff coverage, delegation state, cycle/site split). |
| Permissions (UI) | **Partial** | Director has broad grants in shared role matrix and principal route access; step-up/approval/delegation/acting-as not modeled. |
| Permissions (API/BFF) | **Partial** | `DIRECTOR` mapped broadly in `PolicyService` and demo accounts, but direction-specific resources/actions/endpoints do not exist; no parity tests for director/deputy/teacher permission claims on new flows. |
| Data/API | **Stubbed/missing** | `/v1/dashboard` mock exists; real API has no equivalent direction dashboard contract. No endpoints for D1–D17 workflows. |
| Audit | **Partial** | Generic audit events/timeline in demo data/UI; no action-level audit for approvals/delegations/substitutions/direction decisions. |

## 5. Deputy / direction adjointe — current state

| Area | Status | Notes |
|---|---|---|
| Route/landing | **Partial** | Canonical landing `/vie-scolaire` exists and maps to deputy; renders shared `DashboardSwitch` but no deputy-specific IA/experience. No `/deputy` route/alias guaranteed; label/IA not “Direction adjointe” end-to-end. |
| Navigation | **Partial** | Deputy has a role nav tree (overview/operations) but mostly generic (`students`, `attendance`, `timetable`, soon placeholders for incidents/discipline/duty/cover/activities/reports). Not aligned to E1–E9 or delegated-scope operation. |
| Permissions | **Partial/risky** | Shared `deputy` grants exclude some platform powers but include broad operational permissions; API `DEPUTY` role has substantial access. No delegation-scoped enforcement, no acting-under-delegation state, no expiry/revocation semantics. |
| UI behavior | **Missing** | No explicit 403/insufficient-scope UX for delegated-only actions beyond generic access states; no delegation context indicator. |
| Data/API | **Missing** | No delegation records, no scoped operations endpoints, no approval handoff to director. |
| BFF/tests | **Missing** | No deputy-specific permission-claim/delegation tests covering E1–E9 boundaries. |

## 6. Teacher — relevant current state (T1–T9 dependencies / defects)

| Area | Status | Notes |
|---|---|---|
| Dashboard scoping | **Broken** | `TeacherDashboard` shows timetable/classes/messages/students without scoping to current teacher/classes (defect #4). KPI `todayClasses` derived from weekday only. |
| Quick tasks | **Partial** | Shared `TopTasks` gives timetable/attendance access but not teacher-task-complete flow for attendance/reporting/messaging scoped to own classes. |
| Navigation/routes | **Partial** | Teacher nav includes attendance/register, timetable, messages, students and several `soon` items; needs alignment to T1–T9 and scoped data. |
| Permissions | **Partial** | Teacher grants exist in shared/API matrices, but end-to-end enforcement for scoped resources (own classes/pupils/records) and new teacher actions must be verified. |
| Data/API/mock | **Partial** | Timetable/classes/attendance/students are mockable but lack teacher ownership linkage in demo model and filtering in UI/adapter/API. |

## 7. Permissions, delegation, approval, step-up (foundation gap)

- **Shared:** no `P` (approval-required) action model, no delegation entity/types, no `acting_under_delegation` context, no expiry/revocation helpers. `RouteGuard` supports `requiresStepUp` but only via session `stepUpActive` flag; no action-level step-up orchestration for new sensitive operations.
- **API:** `StepUpRequiredException` exists; no approval workflow engine/state, no delegation persistence/enforcement, no `RedactionService` integration points for new direction views beyond existing AI/analytics tests.
- **BFF:** issues step-up-capable sessions in demo in places, but no parity tests/assertions for director/deputy/teacher claims on direction operations.
- **Required for implementation:** deny-by-default shared permission vocabulary + UI/BFF/API enforcement, `approval_request` model for `P`, delegation create/scope/start/end/reason/expiry/revoke/audit + `acting_under_delegation=true`, step-up on sensitive actions, audit on every privileged mutation, small-cell suppression/redaction where applicable, RLS on every new tenant table.

## 8. Data model / API / mock gaps

- **Migrations:** no `V7__direction_operations.sql` (or V8). Missing tables for delegations, approvals/validations, substitutions/coverage, direction tasks/alerts/compliance deadlines, staff/class/cycle-site assignments needed for D/E/T scoping, and any audit/event structures required by new actions (all must include RLS/tenant isolation per conventions).
- **API controllers/services:** no direction operations module/controllers; existing controllers do not cover D1–D17/E1–E9 flows. `AuditService` usage for new actions not present.
- **API client:** typed queries/mutations for direction/delegation/approval/teacher-scoped operations absent.
- **Mock parity:** `mock/adapter.ts` and `mock/db.ts` handle legacy/demo endpoints only; must mirror every new API contract/state transition (including denials/step-up/approval/delegation states) to keep demo usable.
- **Seed realism:** neither `packages/shared/src/demo-seed.ts` nor `apps/web/src/demo/seed.ts` fully satisfies required FR scenario (2 sites/cycles, 16+ pupils distributed, absent teacher, pending enrolments/approvals, active+expired delegation, overdue fire drill, scoped teacher classes, etc.) in a single coherent model.

## 9. BFF / i18n / formatting gaps

- **BFF:** no director/deputy/teacher permission-claim tests for new direction capabilities; proxy/CSRF/rate-limit must remain intact while adding claims/context.
- **i18n:** missing `nav.settings`, `nav.auditLog`, and all direction/deputy/teacher/approval/delegation strings in FR (primary) and EN; notification/feed content in seed is EN.
- **Formatting:** app partially uses locale-aware helpers (`formatDate`, `formatMoney`) but D/E/T surfaces must consistently use `dd/MM/yyyy`, 24h, Europe/Paris, Monday week start.

## 10. Test and verification gaps

- **Existing relevant tests:** `RoleMatrixTest`, `ControllerPolicyCatalogTest`, `CrossTenantIsolationTest`, `RlsCatalogCheckTest`, `ParentScopeTest`, BFF auth/session tests, analytics/policy tests. Must not be weakened.
- **Missing/required:** delegation scope/expiry/revocation tests, approval (`P`) flow tests, timetable-conflict tests, absence-threshold tests, director/deputy/teacher permission-claim tests (BFF + UI/API as applicable), Playwright journeys for direction/deputy/teacher flows, `verify/features.yaml` entries and `reports/verify/history.csv` updates, screenshots in `docs/screenshots/direction/`.
- **Current `verify/features.yaml`:** no coverage for defects #1–#8 fixes, deputy experience, teacher scoping, or D1–D17/E1–E9/T1–T9 capabilities.

## 11. Prioritized build plan (P0–P5)

### P0 — Audit & defect baseline (this phase)
- [x] Create this audit (`docs/PART9_DIRECTION_AUDIT.md`).
- Next: fix defects #1–#8 with minimal safe changes; unify brand to `SchoolOS` via `packages/shared/src/brand.ts` + i18n/titles/usages; remove/condition `state.partial` banner where modules are implemented; localize feed strings; fix teacher scoping in dashboard/timetable/class queries and seed links; verify/repair enrolment-by-level chart rendering; redesign demo seed as groupe scolaire (2 cycles/sites) and document model/decisions in `docs/DECISIONS.md`.

### P1 — Shared foundations (permission, delegation, approval)
- Extend shared permissions/roles/routes/landing/access helpers for direction actions and object scopes (deny-by-default), including `P` approval states and `D` delegation metadata (`scope/start/end/reason/expiry/revoke`, `acting_under_delegation`).
- Mirror enforcement in UI (`RouteGuard`/action guards/states), BFF session claims, and API `PolicyService`/interceptors/DTO validation; add step-up + audit hooks and redaction/suppression rules where needed.
- Add deputy route/IA (`/deputy` or shared direction layout) labeled “Direction adjointe” with correct 403 on out-of-scope access.

### P2 — Data & backend operations
- Add `V7__direction_operations.sql` (+`V8` if needed) with RLS/constraints/indexes for all new tenant tables; update seed runner/migrations-safe fixtures.
- Implement Spring modulith-compliant services/controllers/events for D1–D17/E1–E9/T1–T9 workflows with `@RequirePermission`, validation, `ApiExceptionHandler`, and `AuditService`.
- Extend `packages/api-client` and mock adapter/db for full contract parity.

### P3 — Web UX (Director, Deputy, Teacher)
- Implement role-appropriate screens/components (shared direction layout where useful), FR-first copy, 24h/`dd/MM/yyyy`/Europe/Paris/Monday, responsive states (loading/empty/error/denied/step-up/approval/delegation).
- Replace placeholders/`soon` items for in-scope responsibilities; wire quick tasks and actionable dashboards.

### P4 — Seed, i18n, docs
- Finalize coherent FR demo scenario (2 sites, 16+ pupils, absent teacher, pending enrolments/approvals, active+expired delegation, overdue fire drill, etc.) in mock + API seed paths as applicable.
- Complete FR/EN translations; update `docs/ROLE_UI_MAP.md`, `docs/SCREEN_INVENTORY.md`, `docs/TRACEABILITY.md`, `docs/DEMO_ACCOUNTS.md`, `docs/DEMO_SCRIPT.md`, `docs/PROGRESS.md`, and add `docs/ROLE_RESPONSIBILITIES_FR.md`.

### P5 — Verification & evidence
- Extend/add required automated tests (security, RLS catalog, delegation/approval/conflict/threshold, BFF claims, UI/API behavior) and Playwright journeys.
- Update `verify/features.yaml` and `reports/verify/history.csv`, capture `docs/screenshots/direction/*`.
- Run: `pnpm -w typecheck`, `pnpm -w lint` (or repo lint command), `pnpm -w test`, `cd services/api && ./gradlew test` (`JAVA_HOME=/opt/homebrew/opt/openjdk@21`), Playwright, `scripts/verify-all.sh` as available.
- Deliver honest D1–D17/E1–E9/T1–T9 status table with evidence; record any conflict/compromise in `docs/DECISIONS.md` (safer option).

## 12. Risks / decisions to record

- **Permission vocabulary mismatch (UI dotted vs API strings):** needs an explicit mapping/normalization strategy to avoid false allow/deny; record in `docs/DECISIONS.md` when implemented.
- **Dual nav sources (`apps/web/src/app/nav.ts` vs shared `ROLE_NAV_TREES`):** converge on shared registry to prevent regressions; remove/align dead config carefully.
- **Seed duality (`packages/shared/src/demo-seed.ts` vs `apps/web/src/demo/seed.ts`):** decide canonical source for mock/UI demo and keep parity with BFF/API demo accounts.
- **Pre-existing local modifications/untracked files:** do not revert or overwrite.

## 13. Audit conclusion

Current direction support is **demo-dashboard-level only** for director and **mostly placeholder** for deputy; teacher scope has a concrete data-leak/mismatch defect. Foundational pieces for D/E/T (delegation, approvals, direction operations schema/API, scoped seed, full i18n, and verification coverage) are **not implemented**. P0 must fix defects #1–#8 and establish the permission/delegation/approval foundation before feature delivery in P2–P4.
