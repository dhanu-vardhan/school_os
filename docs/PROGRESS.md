# Progress

## Done
- Monorepo scaffold (pnpm + Gradle)
- Docker Compose: Postgres, Keycloak, MinIO, Mailpit, ClamAV
- Spring Boot API with tenant filter, tenant-aware datasource, RLS, Flyway V1+V2
- Entities/tests: CrossTenantIsolationTest, RlsCatalogCheckTest
- apps/web preview builds and runs (Vite, host 0.0.0.0:3000)

## In progress (Prompt 9, A1/A2/C1 started)
- 401/unstyled preview diagnosed and fixed (Tailwind+tokens+CSS import, self-contained mock boot, no /api calls)
- Director Classes screen built as luxury reference (KPIs, filters, card/table, detail, seeded 12 classes)
- Screenshots captured: /tmp/classes-390.png, /tmp/classes-768.png, /tmp/classes-1280.png

## Next
- A1/A2: add automated smoke + visual-render tests (Playwright/CI), complete role smoke checks
- B1-B3: formalize tokens in packages/ui + Storybook design-language page + full shell
- C1 owner review, then C3/C2 screens with Part D gates

## Part 6 (UI Acadia) progress
- Token system migrated to navy/royal blue + sky accent; contrast passes all 4 modes.
- Login page rebuilt as split-screen with inline SVG brand mark + line-art background, configurable brand, responsive.
- App shell sidebar restyled to deep navy.
- Docs: UI_LOGIN_SPEC.md, DECISIONS.md, PHASE_REPORTS/ui-acadia.md.
- Reference image docs/design/login-reference.png is missing; please add. Screenshots not yet captured.

## Part 7 (role dashboards & access) progress
- Created packages/shared/src/access module (roles, permissions, routes, landing) + docs/ROLE_UI_MAP.md.
- Added apps/web/src/access guards (RequirePermission, RequireTenant) and branded 403 page actions.
- Existing role-based dashboards (admin/teacher/parent/student) retained; nav already permission-filtered.
- Deeper per-role dashboards and 15-role coverage documented as follow-ups.

## Known issues
- No Playwright browser installed in env; screenshots taken via Chrome headless only
- Preview is mock-only; BFF/Keycloak real login and real API-backed RLS student flow not wired
- Native builds, payments, notifications, jobs, AI gateway not implemented

## Prompt 10 (verify-all) step 1
- Added `scripts/verify-all.sh/.ps1`, `make verify`, `verify/runner.py` (G0,G1,G2,G10), `verify/features.yaml` (122 features from traceability/screen inventory), reports (md/json/junit/csv/history), `docs/VERIFY.md`.
- Latest full run: `reports/verify/20261116T223323Z` PASS 14/14 checks, 122 features, 114 warnings (stubbed/planned/known-broken), 0 missing checks for expected-working.
- Pending: groups G3-G9,G11-G14, Playwright screen sweep/a11y/perf, break-it selftests, CI (PR quick/nightly full/release gate), fuller Windows parity, start/seed/teardown automation, OpenAPI/route coverage enforcement.

## Prompt 11 (demo) step 1
- Added demo landing with one-click role login (13 roles), local stateful demo engine (localStorage seed/reset), `scripts/demo.sh/.ps1`, `make demo/demo-reset`, `docs/DEMO_SCRIPT.md`, `verify/demo-features.yaml`.
- Interactive flows wired (cross-role via shared state): director classes/create/announce, teacher attendance/messages/observations, guardian absence/messages reply/payments sandbox/activities/pickup QR, offline toggle.
- Build: `apps/web` OK. verify-all --quick PASS (reports/verify/20261116T223814Z). Screenshots: `/tmp/demo-landing.png`.
- Next/stubbed: richer seed pack v1 (2 schools/full dataset), demo clock/sim actors/mail+device inbox, dead-control sweep & G15, remaining role journeys (finance/admissions/reception/provider/safeguarding/operator deep), real-stack demo auth wiring, production-exclusion guards.

## Part 8 (governed analytics) progress — 2026-11-17
- Design/dictionary first: `docs/ANALYTICS_DESIGN.md`, `docs/METRIC_DICTIONARY.md` (v1.0.0), decisions A8-1…A8-9 in `docs/DECISIONS.md`.
- Shared contracts + core: `packages/shared/src/metrics/`, `packages/shared/src/analytics-demo.ts`, `packages/analytics-core/` with golden/invariant tests and FR/EN + role/permission registries.
- Mock adapter/UI: flagged `packages/api-client/src/mock/analytics.ts`, typed hooks, URL-synced filters, `/app/analytics`, `/app/analytics/explore`, `/ui-kit/analytics`, role-scoped dashboards plus Data Analyst workspace, colour-blind-safe UI kit and i18n.
- Backend: Flyway V6 RLS-forced aggregate tables, `@Scheduled` refresh with `sourceAvailable=false`, governed `/api/analytics/**` facade + `/api/v1/analytics/**` sibling, policy/audit/suppression/exports/saved views. No upstream facts are fabricated.
- Docs/registries updated: `AI_GOVERNANCE.md`, `COMPLIANCE.md`, `MODEL_REGISTRY.md`, `FRONTEND_WIRING.md`, `GAP_REPORT.md` (A1–A11), `DEMO_SCRIPT.md` (P1–P6), `TRACEABILITY.md`, `verify/features.yaml` (13 `stubbed` P8 entries).
- Final observed checks: Gradle `--rerun-tasks` BUILD SUCCESSFUL (94 tests, 0 failures/errors/skipped; 55 analytics tests in 9 classes); `pnpm typecheck && pnpm lint && pnpm test && pnpm build` exit 0 (89 Vitest tests, 29 analytics-core + 5 invariants + 10 analytics UI); Playwright analytics 7 passed/1 intentional skip; 7 screenshots in `docs/screenshots/analytics/`.
- Honest phase report: `docs/PHASE_REPORTS/analytics.md`. Not measured: p95<400 ms at 5,000×5 years, full axe audit. Not implemented: real upstream fact source, XLSX/PDF/object-storage downloads, per-export salt, per-user insight prefs, UI consumption of saved-view API, AI narratives (no pinned model).

## PROMPT 000 — Platform foundations (P0 audit + defect fixes), 2026-11-18 (in progress, uncommitted at audit time → committed as P0)

### Done (this session)
- **P0 audit:** produced `docs/PART12_PLATFORM_FOUNDATIONS.md` with evidence-based status for **F-1..F-16**, **§4 cross-role defects**, cross-cutting gaps, prioritized P0→P3 plan, sequencing (002→005→006→003→004→008→007→010→011→012→009→013), and residual risks.
- **Defect #1 (dashboards):** replaced director-clone fallthrough with role-specific, scoped dashboards for all canonical roles in `apps/web/src/pages/Dashboards.tsx` (principal, school-admin, deputy, teacher, parent, student, safeguarding-lead, nurse, finance, HR, IT admin, librarian, receptionist, auditor, analyst, group admin, platform/super-admin). `DashboardSwitch` now resolves via `displayToCanonical` and renders a per-role `data-testid="dashboard-…"`. Leadership-only KPIs (concerns/AI/whole-school overview) are no longer shown to restricted/non-leadership roles.
- **Defect #2 (nav keys):** reconciled in-flight nav translations and added `apps/web/src/test/nav-i18n.test.tsx` asserting no rendered `nav.*` labels for every canonical role.
- **Defect #3 (feeds/i18n):** localized remaining English demo-seed strings (safeguarding concern summaries/actions, custody note, AI weekly brief) to French; prior uncommitted finance/feed locale updates retained.
- **Defect #4 (chart):** not re-verified visually this session; enrolment-by-level bar remains in leadership dashboards and existing robustness intent preserved (needs Playwright/screenshot confirmation).
- **Defect #5 (brand):** login copy moved to i18n/SchoolOS brand keys (FR-primary), removing hard-coded English marketing/demo labels in key areas; `app.name` remains SchoolOS.
- **Defect #6 (demo exposure):** login demo picker/banner gated by `config.demoEnabled && config.authMode === 'demo'` (defense-in-depth with server config), demo account query disabled outside demo mode, and dead "Try the demo" affordance removed.
- **Defect #7 (groupe scolaire):** demo seed already reflects "Groupe scolaire Saint-Denis" (site primaire MS–CM2 + site collège 6e–5e) with distributed pupils/classes; full model/contract completion remains for later prompts/phases.
- **Tests added:** `apps/web/src/test/role-dashboards.test.tsx` asserts each canonical role landing is reachable, representative forbidden routes are denied, and each role renders its own dashboard (no principal/director clone).

### Verified (this session)
- `pnpm --filter @schoolos/web typecheck` — **pass**.
- `pnpm --filter @schoolos/web test` — **pass** (12 files, 125 tests; includes `nav-i18n.test.tsx`, `role-dashboards.test.tsx`, existing access/analytics/screens tests).
- Not run this session: `pnpm -w` lint/test/typecheck (full workspace), Playwright e2e/screenshots, `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test`, `scripts/verify-all.sh`, direct BFF/API access-enforcement proofs for PROMPT 004 P0. Backend untouched by these UI/doc changes but full regression not re-executed.

### In-flight reconciled (kept)
- Uncommitted P004/P9 foundation items retained: `docs/PART11_FINANCE_AUDIT.md`, `docs/FINANCE_POLICY_FR.md`, finance-scoped `FinanceDashboard` in `apps/web/src/pages/Dashboards.tsx`, locale additions in `packages/i18n/src/locales/{fr,en}.ts`, `docs/DECISIONS.md` P11 entries. Pre-existing unrelated local modifications intentionally untouched: `apps/web/src/main.tsx`, `services/api/src/main/java/com/schoolos/pedagogy/LessonPlan.java`, `apps/web/src/dashboard/`, `docs/DASHBOARD_DESIGN.md`.

### Remaining for PROMPT 000
- **P0 close-out:** run broader verification as available (workspace/Gradle/Playwright/verify-all) and gather PROMPT 004 route/API access evidence; commit P0 with honest status.
- **P1:** implement/harden F-1..F-16 (single permission source of truth + `docs/ROLE_MATRIX.md` + CI stale-fail, global role×endpoint expected-outcome matrix, scope resolver/IDOR coverage, unified audit/sensitive reads, policy engine + `docs/POLICY_REGISTER_FR.md`, approvals/delegation, consent/files/import/jobs/calendar/search/flags/i18n/observability, prod-safe demo guards).
- **P2:** role-agnostic hardening (broader untranslated-key DOM guard, global audit coverage, cross-role defect regressions, PWA/offline-sensitive-data hygiene).
- **P3:** full verify + docs (`PRODUCTION_READINESS.md`, `ROLE_RESPONSIBILITIES_FR.md`, `TRACEABILITY.md`, `SCREEN_INVENTORY.md`, `ROLE_UI_MAP.md`, `DEMO_SCRIPT.md`, `DEMO_ACCOUNTS.md`, etc.) and production gate (`DemoStartupGuard`/BFF refuse insecure prod states). Then continue prompt registry in order (002→005→006→003→004→008→007→010→011→012→009→013).

### Resume here
- Read `docs/PART12_PLATFORM_FOUNDATIONS.md` and this section first. Re-run `pnpm --filter @schoolos/web typecheck && pnpm --filter @schoolos/web test`; then run broader checks (`pnpm -r typecheck`, `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test`, Playwright, `scripts/verify-all.sh`) as environment allows.
- Do **not** weaken security/RLS tests. Commit P0 before starting P1; never proceed with red tests. Keep pre-existing unrelated local modifications untouched.
