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
