# Part 4 — Step 0 stabilisation

Date: 2026-11-17. Source of truth: commands executed in this repository on the
working tree at commit `2fcada6` plus uncommitted UI changes from Part 2 phase 8.

## Re-orientation finding (important)

The Part 4 prompt assumes Parts 1–3 are Done and that `docs/FEATURE_PLAN.md`
exists. In this repository that is **not** the case:

| Expected | Actual |
|---|---|
| `docs/FEATURE_PLAN.md` | Missing; created by this step. |
| EPIC 1–20 implemented | Not implemented as backend epics. The registry `verify/features.yaml` still marks most P1/P2/P3 items `planned` or `stubbed`. |
| Backend modules for classes/timetable/attendance/billing/communication | Only tenancy, people (student), activities/safeguarding schema, AI ports exist. |
| `PHASE_REPORTS/*` | Only `phase-0.md`. |
| UI | Real design system + mock-backed screens for many planned areas (Part 2 phases 1–8). |

Consequence: "fix every red test from earlier epics" means fixing the defects
that actually exist, not inventing missing epics. Track D epics 37–41 must be
completed before any real school data enters an environment; that gate is
recorded in `docs/PILOT_READINESS.md`.

## Baseline verification run (all executed)

| Gate | Command | Result |
|---|---|---|
| Verify suite | `./scripts/verify-all.sh` | PASS 14/14, 140 features registered, 132 warnings (planned/stubbed) |
| Colour/action lint | `pnpm lint` | PASS (contrast AA in light/dark/high-contrast/dark-high-contrast) |
| Typecheck | `pnpm typecheck` | PASS (web + bff) |
| Web build | `pnpm build` | PASS (PWA generated; index chunk 604 kB gzip 185 kB > 500 kB warning) |
| Unit/component tests | `pnpm --filter @schoolos/web test` | PASS 40/40 (5 files) |
| BFF tests | `node --test services/bff/test/*.test.js` | PASS 6/6 |
| API tests | `cd services/api && ./gradlew test` | BUILD SUCCESSFUL (Testcontainers) |
| E2E smoke | `npx playwright test` | PASS 18/20, 2 skipped (viewport-specific duplicates), CLS 0.0000 desktop+mobile |

No red test and no flaky test was observed in this run.

## Defects found and fixed in this step

| # | Defect | Evidence | Fix |
|---|---|---|---|
| S1 | `--selftest-break` advertised by DECISIONS as required honesty test but returned "not implemented" | `verify/runner.py` exited 1 for all three modes | Implemented fault-injection selftests: `api401`, `nostyle`, `rls` each inject a known fault and require the corresponding detector to fail. All three PASS (see below). |
| S2 | Feature coverage was a hard-coded allow-list (`covered_ids`) instead of being derived from executed checks | `verify/runner.py` line ~141 | Coverage is now computed from the feature tags emitted by executed checks; missing expected-working coverage still fails the run. Verify remains PASS. |
| S3 | `docs/PILOT_READINESS.md` contained a stray shell/python heredoc after `EOF` | file tail lines 14–19 | Removed; replaced with an evidence table and the explicit Track D 37–41 gate. |

Selftest evidence (executed):

```
selftest-break api401: PASS - 1 check(s) failed as expected: api.protected
selftest-break nostyle: PASS - 1 check(s) failed as expected: web.not_unstyled_marker
selftest-break rls: PASS - 2 check(s) failed as expected: rls.forced.core_tables, schema.student.ine_number
```

## Known gaps carried forward (honest list)

These are **not** red tests today; they are unscheduled or partially delivered
work recorded in `docs/GAP_REPORT.md` and `verify/features.yaml`:

1. Backend feature modules beyond tenancy/people/activities-schema/AI-ports are
   absent (classes, timetable, attendance persistence, messaging, calendar,
   forms/signatures, billing, admissions, notifications, audit, staff, health…).
   The UI covers them with mock data only.
2. Verify groups G3–G9 and G11–G14 are unimplemented; `runner.py` would report
   them as failing groups if requested. They remain out of the default run.
3. CI runs backend tests and the web build only. No lint/typecheck/unit/e2e/
   contract/secret-scan jobs yet (EPIC 38).
4. Bundle-size budget: the single `index` chunk exceeds Vite's 500 kB warning.
   Route splitting exists; further vendor splitting is parked for EPIC 38/39.
5. No dependency/container vulnerability scan, SBOM, or migration dry-run in CI.
6. Object storage/ClamAV/upload scanning are documented but not wired.
7. Health, SEN, safeguarding, payments threat models and DPO review notes do not
   exist yet (required before those sensitive epics merge).
8. Load testing (k6) and p95 targets are not established.

## Stabilisation gate applied before new features

- Full verify suite green (rerun after each epic): required.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, web unit tests, BFF tests,
  Gradle tests, Playwright smoke: required.
- New tenant tables must appear in the RLS catalog check automatically
  (`RlsCatalogCheckTest` queries every `school_id` table).
- Cross-tenant isolation test extended per new aggregate.
- No feature may be marked verified from file presence alone.
