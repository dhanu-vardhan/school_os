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

### Resume here
- All Part 8 changes are **uncommitted**. Do not commit/push without an explicit request.
- If resuming: first re-read `docs/PHASE_REPORTS/analytics.md` and `docs/GAP_REPORT.md` §“Part 8 analytics addendum”; then re-run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test --console=plain` and `cd apps/web && pnpm exec playwright test e2e/analytics.spec.ts --reporter=line`.
- Highest-value next work: close A1 by wiring a real `AnalyticsFactSource`; close A3 by consuming `/api/analytics/views` in the UI; add a registered `verify/runner.py` check before promoting any P8 feature from `stubbed`; measure p95 and run a full axe audit.
