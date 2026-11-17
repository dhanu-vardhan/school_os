# Phase report — Part 8 governed analytics (2026-11-17)

**Status:** implemented, contract-tested and browser-smoke-tested; **not** backed by production
academic facts. Every shipped demo number comes from a flagged mock adapter, and the governed
backend refresh job explicitly records `sourceAvailable=false` instead of inventing rows.

**Authority docs:** `docs/ANALYTICS_DESIGN.md` (design), `docs/METRIC_DICTIONARY.md` (formulae),
`docs/DECISIONS.md` (A8-1…A8-9), `docs/GAP_REPORT.md` (honest gaps), `docs/COMPLIANCE.md`,
`docs/AI_GOVERNANCE.md`, `docs/MODEL_REGISTRY.md`, `docs/FRONTEND_WIRING.md`,
`docs/DEMO_SCRIPT.md`, `docs/TRACEABILITY.md`, `verify/features.yaml`.

---

## 1. What was delivered

| Area | Delivered | Evidence |
|---|---|---|
| Metric dictionary | Version `1.0.0`, FR/EN names, exact formulae, grains, units, roles, minimum `n`, caveats, mandatory wording | `docs/METRIC_DICTIONARY.md`, `packages/shared/src/metrics/`, `GET /api/analytics/dictionary` |
| Statistical core | Wilson/t/OLS/seasonal/trend/forecast/insight helpers with golden fixtures and aggregation invariants | `packages/analytics-core/src`, `packages/analytics-core/src/__tests__/`, `services/api/src/test/resources/analytics/golden.json` |
| Governed aggregates | Flyway V6 tables with `school_id`, forced RLS, `school_isolation` policy, tenant-local binding, refresh state | `services/api/src/main/resources/db/migration/V6__analytics.sql`, `AnalyticsRefreshJob`, `AnalyticsRefreshService`, `JpaAnalyticsFactSource` |
| API | Read-only series/table/matrix/overview/insights/explain/freshness/dictionary/student endpoints, pagination, `data`+`meta` envelopes, metric ids, `n`, CI, suppression flag, freshness, explain payloads | `services/api/src/main/java/com/schoolos/analytics/`, documented facade `/api/analytics/**`, backwards-compatible `/api/v1/analytics/**` |
| Authorisation & audit | Deny-by-default `@RequirePermission`, `PolicyService` role scoping, student-level scope checks, append-only audit events including denied broadening attempts | `AnalyticsPolicyService`, `AnalyticsAuditService`, `AnalyticsControllerPolicyTest`, `AnalyticsPart8PolicyTest` |
| Privacy | Small-cell suppression (`n<5`, configurable 3–20 for head/admin) applied before serialization on series/table/matrix/drill-down; no staff ranking, no sensitive dimensions | `packages/analytics-core/src/suppression.ts`, Java `AnalyticsSuppression`, `AnalyticsPart8SuppressionTest`, `docs/COMPLIANCE.md` |
| Exports & views | Governed async CSV export with step-up, watermark confirmation, idempotency and job status; per-user RLS saved-view API | `AnalyticsExportService`, `AsyncExportRequest`, `AnalyticsSavedView*`, `POST /api/analytics/exports`, `GET|POST /api/analytics/views` |
| UI kit | `MetricCard`, `ChartCard`, `AnalyticsChart`, `DrillDown`, `InsightCard`, `FilterBar`, `ExplainPanel`, `ScenarioPanel`, `TargetEditor`, `InterventionTracker`; question titles, tooltips with `n`, aria summaries, table alternatives, light/dark, reduced-motion, mobile layout | `packages/ui/src/components/Analytics.tsx`, `/ui-kit/analytics`, `--chart-*` tokens |
| Pages & filters | `/app/analytics`, `/app/analytics/explore`, `/ui-kit/analytics`; role-scoped dashboard variants including Data Analyst; URL is the single source of truth for filters; no analytics filter writes to browser storage | `apps/web/src/pages/Analytics*.tsx`, `apps/web/src/app/analytics.ts`, `docs/FRONTEND_WIRING.md` |
| Insights | Rule-based sudden-drop/lateness/hot-spot/item, homework, data-quality and collection rules with severity, evidence, action, dismiss/snooze UX; AI narratives disabled | `packages/analytics-core/src/insights.ts`, `InsightCard`, `docs/AI_GOVERNANCE.md`, `docs/MODEL_REGISTRY.md` |
| Demo data | Deterministic 3-school-year synthetic set with planted patterns P1–P6 and seasonality; every response carries `meta.mock=true`, `sourceAvailable=false`, freshness and explain metadata | `packages/shared/src/analytics-demo.ts`, `packages/api-client/src/mock/analytics.ts`, `docs/DEMO_SCRIPT.md` |
| Docs & registry | Design, dictionary, wiring, compliance, governance, decisions, traceability, demo script, gap report and 13 `stubbed` P8 feature-registry entries | listed above plus `verify/features.yaml` |

## 2. Test evidence actually observed

| Command (run from repo root unless noted) | Result |
|---|---|
| `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test --rerun-tasks --console=plain` | `BUILD SUCCESSFUL`; **94** tests, 0 failures, 0 errors, 0 skipped. Nine analytics test classes account for **55** analytics tests (`TEST-com.schoolos.analytics*.xml`). |
| `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test --tests 'com.schoolos.analytics.AnalyticsPart8*' --console=plain` | Passed (Part 8 API, migration contract, policy and suppression suites). |
| `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | Exit `0`. Typecheck, colour/action/contrast/auth-safety lints, build and all **89** Vitest tests passed (9 files). Analytics-specific tests: **29** `analytics-core`, **5** `analytics-invariants`, **10** `analytics-ui`. |
| `pnpm exec playwright test e2e/analytics.spec.ts --reporter=line` from `apps/web` | **7 passed, 1 skipped**. The skip is intentional project filtering (mobile-only/desktop-only projects), not a failure. The suite exercises dashboard light/dark/mobile, Explore, table alternative, theme control and UI-kit variants. |
| `verify/runner.py` registry check for `verify/features.yaml` | 153 features, 13 P8 entries, no duplicate ids. All 13 P8 entries are `stubbed` with reasons: no `verify/runner.py` check is registered, so none is falsely reported as verified. |

Non-blocking warnings observed: React `act(...)` warnings from existing Radix checkbox tests, and
Vite's `>500 kB` chunk-size advisory for the shared entry bundle. Neither fails a gate. The
analytics route chunks are separately emitted (`AnalyticsDashboard` 8.43 kB, `AnalyticsExplore`
8.03 kB, shared `Analytics` 16.96 kB).

## 3. Screenshots

Captured in `docs/screenshots/analytics/`:

- `dashboard-desktop-light.png`
- `dashboard-desktop-dark.png`
- `dashboard-mobile.png`
- `explore-desktop.png`
- `ui-kit-light.png`
- `ui-kit-dark.png`
- `ui-kit-mobile.png`

The mobile capture confirmed and drove the overflow fixes in `AnalyticsDashboard.tsx` (`min-w-0` /
`truncate` on governance cards) and `AppShell.tsx` (duplicate account/settings icons hidden below
`sm`).

## 4. Mock boundary and honest limitations

1. **No upstream academic facts exist.** V6 creates governed aggregate tables, but there are no
   attendance, mark, homework or finance source tables in V1–V5. `AnalyticsRefreshJob` records
   `sourceAvailable=false` and inserts no fabricated rows.
2. **Demo numbers are synthetic.** `packages/api-client/src/mock/analytics.ts` generates
   deterministic data from `packages/shared/src/analytics-demo.ts`; every response has
   `meta.mock=true`, `sourceAvailable=false`, suppression threshold, freshness and explain
   payloads. The UI shows “Données fictives”. Production code imports demo definitions only with
   `import type` and cannot execute the generator.
3. **Routes differ from the conceptual design.** Two governed routes (`/app/analytics`,
   `/app/analytics/explore`) serve role-scoped variants; the per-role tab sets in
   `ANALYTICS_DESIGN.md` §6 remain follow-up work (gap A4).
4. **Saved views:** the governed API has `/api/analytics/views`, but the UI still keeps named views
   in component memory because no BFF client consumption has been wired; a reload loses them.
   URL filters persist correctly and no browser storage is written (gap A3).
5. **Exports:** governed CSV is async, step-up-gated, watermarked and idempotent. No XLSX/PDF,
   object-storage download, or fresh per-export pseudonym salt is implemented (gap A7).
6. **AI narratives:** disabled; `MODEL_REGISTRY.md` pins no model. Only deterministic rules ship.
7. **Targets not measured:** p95 < 400 ms at 5,000 students × 5 years, the 60 s refresh budget and
   a full axe audit are design targets, not measured results (gap A9).
8. **DPO/legal gates:** chronic flag, support composite, fairness panel and any future
   gender/age/support breakdown are disabled for real data pending review (gaps A11;
   `TODO(legal-review)`).
9. **Verify registry honesty:** the 13 P8 rows are `stubbed`, not `expected-working`, because the
   unit, Java and Playwright runs are outside `verify/runner.py`.

The complete gap list is `docs/GAP_REPORT.md` §“Part 8 analytics addendum” (A1–A11).
`docs/ANALYTICS_DESIGN.md` §10 records the same unresolved items from the design side.

## 5. Reproduce

```bash
# Frontend gates
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Analytics browser checks and screenshots (from apps/web)
cd apps/web && pnpm exec playwright test e2e/analytics.spec.ts --reporter=line

# Backend gates (from services/api)
cd services/api
JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test --console=plain

# Demo walk-through
make demo   # then sign in as Direction or Analyste de données
```

See `docs/DEMO_SCRIPT.md` §“Part 8 — parcours analytique” for the five-minute script and the
P1–P6 planted patterns.

## 6. Hand-off

The layer is safe to demo and to review as a contract: role scoping, suppression, explainability,
audit hooks and grid isolation are implemented and tested. It must **not** be presented as
production analytics until an upstream `AnalyticsFactSource` supplies real tenant data, the
remaining A1–A11 gaps are closed, and the perf/a11y targets are measured. All changes for this
phase are left uncommitted; do not commit or push without an explicit request.
