# Analytics design — governed decision-support layer (Part 8)

**Status:** design authority for the analytics layer. Last updated 2026-11-17.
**Companion docs:** `METRIC_DICTIONARY.md` (metric definitions), `COMPLIANCE.md` (classification,
suppression, DPO flags), `AI_GOVERNANCE.md` (narratives & forecasts), `MODEL_REGISTRY.md`,
`ROLE_UI_MAP.md` (role → nav), `DESIGN_TOKENS.md` (Part 6 colour language), `FRONTEND_WIRING.md`
(mock boundary). Backend remains authoritative for authorisation; UI hiding is UX only.

---

## 1. Scope and principles

This layer answers decision questions for head teachers, teachers, parents, finance leads,
inspectors and analysts. It is **read-only**: no analytics endpoint mutates operational data.

1. **Every chart answers a question** and leads to an action; no vanity charts. Chart titles are
   questions or insights, not noun labels (“Which periods have the most lateness?”).
2. **Show uncertainty honestly**: `n`, data-as-of freshness, confidence intervals for rates/means,
   and a low-sample badge instead of a confident-looking number.
3. **Explain itself**: “Explain this chart” reveals inputs, formula (from the metric dictionary),
   exclusions, comparison basis and heuristic thresholds.
4. **Association ≠ causation**: every correlation/scatter/risk view carries the mandatory sentence
   and an effect size + `n`.
5. **Decisions support humans**: never auto-act on a pupil, never rank teachers, never label a
   child. Risk language is supportive (“needs support”), rule-based and fully explainable.
6. **Aggregate first**: individual-level data only for authorised roles with an audit record.
7. **Contracts identical, source flagged**: upstream attendance/grade/finance facts from Part 3
   epics do not exist as DB tables yet (see §3). The demo adapter produces the *same response
   shapes* and marks every response `meta.mock = true`; the UI shows a “Mock data” badge. No
   production code path fabricates numbers.

---

## 2. Discovery findings (what actually exists, 2026-11-17)

| Area | Finding | Consequence for this design |
|---|---|---|
| DB | 5 migrations (V1–V5), 18 tables. No `class`, academic `attendance`, `mark`/`grade`, `calendar`, `invoice` or `enrolment` tables. `student.class_id` is a bare UUID. | Analytics facts cannot yet be refreshed from real DB tables; mock adapter supplies them under a flagged contract. |
| RLS | Every tenant table has `school_id`, `ENABLE` + `FORCE` RLS, policy `school_isolation`, `idx_<table>_school`. `RlsCatalogCheckTest` discovers tables dynamically (`relkind='r'` + `school_id` column), so new aggregate **tables** are covered automatically; **views/MVs are not**. | Use ordinary tables for aggregates (not materialised views) so the catalog check polices them; add an explicit MV policy test only if we later adopt MVs. |
| Schedulers | No JobRunr, no `@Scheduled`, no `@EnableScheduling`. | Add a minimal Spring `@Scheduled` refresh component (no new broker, Phase 1 constraint). Idempotent, incremental, watermarked. |
| Aggregates | None. `buildDashboard()`/`buildReport()` in `packages/api-client/src/mock/adapter.ts` compute a few in-memory aggregates. | Replace with a governed metric pipeline; keep the old endpoints for backwards compatibility during the transition. |
| Auth | Deny-by-default `@RequirePermission`, `PolicyService`, `StepUpFilter`, membership-derived tenant+role, hash-chained security log. | Every analytics mapping gets a permission; deny-by-default catalog test covers it automatically. |
| Frontend | `apps/web/src/demo/seed.ts` is legacy/unreferenced; `packages/shared/src/demo-seed.ts` is canonical. Mock adapter + `VITE_USE_MOCK`; route-level lazy loading; Part 6 tokens. | Analytics UI consumes new typed hooks and the mock adapter; charts use `--chart-*` tokens only. |

---

## 3. Data model

### 3.1 Logical model (governed aggregates)

```
school (V1) ──< analytics_daily_attendance_fact >── student (V1)
                    │  grain: school_id × student_key × school_date × session
                    │  measures: present/unjustified/justified/late flags, minutes_late,
                    │            register_taken, register_on_time
analytics_assessment_fact      grain: school_id × student_key × assessment_key × term
                    │  measures: raw_mark, scale_max, coefficient, is_dispensed,
                    │            is_absent, item_correct (item-level rows optional)
analytics_student_term_fact    grain: school_id × student_key × term_key
                    │  measures: weighted_avg, prior_avg, mark_count, attendance_rate,
                    │            homework_submitted/assigned, support_flag, composite_value
analytics_cohort_dim           grain: school_id × cohort_key × year
                    │  attributes: level, entry_year (no sensitive attributes)
analytics_class_dim            grain: school_id × class_key × year × term
                    │  attributes: level, subject mix, headcount band (no teacher name)
analytics_finance_fact         grain: school_id × period × bucket
                    │  measures: invoiced_collected_cents, outstanding_cents, age_bucket
analytics_refresh_state        grain: school_id × fact_name → last_refreshed_at, watermark
```

**Pseudonymous keys.** Fact tables store `student_key` = HMAC(school_id, student_uuid) with a
per-school rotating salt, **never** a direct identifier. Real DB refresh will map keys to
students inside an authorised, audited service; exports get a *fresh* salt so keys cannot be
joined across exports (“pseudonymous student keys that reset per export”). The demo adapter
uses stable synthetic keys only in-memory and never persists them.

### 3.2 Physical table rules (Flyway V6)

Every table: `id UUID PK`, `school_id UUID NOT NULL REFERENCES school(id)`,
`ENABLE` + `FORCE ROW LEVEL SECURITY`, `school_isolation` policy with transaction-local
`current_setting('app.current_school', true)`, index on `school_id`, plus grain-specific
composite indexes. `schoolos_app` has SELECT on all analytics tables; writes are narrowed to refresh state and
derived aggregates, INSERT-only on the audit chain, and owner-scoped CRUD on saved views. The
runtime role has no DDL and no BYPASSRLS per AGENTS.md. Aggregates are ordinary tables, not
views, so the RLS catalog test covers them.

### 3.3 Refresh

`AnalyticsRefreshJob` (`@Scheduled`, fixed delay, configurable cron) runs per school:
1. read `analytics_refresh_state.watermark` for each fact;
2. upsert only rows with `updated_at > watermark` (incremental), idempotent by natural key;
3. update `last_refreshed_at` + watermark in the same transaction;
4. never log row contents, only counts and duration.

Because upstream fact tables do not exist yet, the job currently completes with
`sourceAvailable = false` and records that state explicitly (no fabricated rows). The UI
reads `meta.dataAsOf` from the demo adapter, which has its own synthetic “as of” timestamp.

---

## 4. API contract (read-only, tenant-safe)

```
GET  /api/analytics/{metricId}/series?from&to&grain&class&level&subject&cohort&comparison
GET  /api/analytics/{metricId}/table?page&pageSize&sort  (paginated)
GET  /api/analytics/{metricId}/matrix?dimensionA&dimensionB
GET  /api/analytics/overview?dashboard=principal&...
GET  /api/analytics/insights?dashboard=...               (dismiss/snooze are per-user UX; server store pending)
GET  /api/analytics/explain/{metricId}?...               (inputs behind the value)
GET  /api/analytics/meta/freshness
GET  /api/analytics/dictionary                           (versioned metric definitions)
GET  /api/analytics/dashboard | /trends/{id} | /cohorts/{id}
GET  /api/analytics/students/{id}?metricId=...            (requires analytics.student, audited)
POST /api/analytics/exports                              (async job, step-up + watermark confirmation + idempotency)
GET  /api/analytics/exports/{id}
GET|POST /api/analytics/views, DELETE /api/analytics/views/{id}  (per-user saved views, RLS)
```

Core metric reads exist under both `/api/analytics` (documented facade) and
`/api/v1/analytics` (backwards-compatible sibling); dictionary, async exports and saved views
are facade-only today. Every read mapping requires `analytics.read`, exports require
`analytics.export` and student drill-down requires `analytics.student`.

Response envelope (from `packages/shared/src/metrics/types.ts`):

```json
{
  "data": [ { "label": "2026-09", "value": 93.4, "n": 118,
              "ci": {"lower": 91.2, "upper": 95.1, "method": "wilson-95"} } ],
  "meta": {
    "metricIds": ["attendance.rate"],
    "n": 118, "denominator": "expected half-days, open school days only",
    "ci": {"lower": 91.2, "upper": 95.1, "method": "wilson-95"},
    "suppressedCells": true, "suppressionThreshold": 5, "lowSample": false,
    "dataAsOf": "2026-11-17T08:15:00Z", "mock": false,
    "explain": {"present": 1102, "expected": 1180, "excusedExcluded": 38},
    "associationNotCausation": false
  }
}
```

**Parameters** are validated at the boundary (Bean Validation) and constrained to the metric
dictionary; unknown metric id → 404; unknown parameter → 400. Filters are **never** accepted
from a body/header for tenant scope — `school_id` comes only from the JWT/membership
(AGENTS.md rule 1). URL filters are application filters (class/level/subject), not tenant scope.

**Authorisation (deny-by-default):** each mapping carries `@RequirePermission("analytics.read")`;
`PolicyService.scope(role, filters, currentUser)` narrows rows *at query time*:
teacher → classes they teach; parent → linked children; student → self; head/admin → school;
group admin → cross-school normalised aggregates only; auditor → read-only aggregates;
analyst → pseudonymised within school. A teacher requesting another class, a parent another
child, or a student any other pupil gets 403. Every access to student-level rows appends an
audit event (actor, metric, scope, timestamp, no values). Deny/allow tests exist per endpoint.

---

## 5. Privacy & governance rules

| Rule | Implementation |
|---|---|
| Small-cell suppression | `n < 5` (configurable 3–20, head/admin only) → cell hidden, merged into “other” with its own `n`. Same suppression on filtered/drill-down views to block differencing. |
| No re-identification | Suppression is applied before response serialisation; comparing two filtered views cannot reveal a suppressed cell (min group size enforced on both). Drill-down permission checks at each breadcrumb step. |
| No staff ranking | Only class/subject aggregates with context; no `teacher_id` in any analytics response. Aggregate value-added carries the intake banner. |
| Sensitive categories | No ethnic/religious/health/disability/safeguarding dimensions. Gender/age-band/level only when the school enables them. Special-needs/health/safeguarding counts are suppressed + DPO-flagged. **France: statistics on sensitive attributes are restricted — `TODO(DPO/legal review)`.** |
| Profiling-like features | Chronic-absence flag and support composite are `TODO(DPO review)`; rule-based, explainable, false-positive feedback, owner + outcome log, fairness panel. No automated decision. |
| No data in logs/URLs/notifications | Filters in URLs are non-sensitive ids only; values, pseudonymous keys and personal data never logged. Hash-chained audit stores scope, not values. |
| Exports | Step-up (`export` permission), async job, watermark “Confidential · generated by · timestamp”, fresh pseudonym salt per export, audit record, CSV/XLSX/PDF. |
| AI narratives (optional) | Aggregate-only, redacted input; feature-flagged per school; quota-limited; labelled “AI-generated, review required”; model id/version logged; never auto-applied. |

Data classification: aggregates are `internal`; pseudonymous student-level rows are
`confidential-minor`; support-flag lists are `confidential-minor` + `TODO(DPO review)`.
See `COMPLIANCE.md`.

---

## 6. Role → dashboard map

Full permission set is in `packages/shared/src/access/` and `docs/ROLE_UI_MAP.md`. Every role's
nav gains an **Analytics** entry gated by `analytics:*`. Scope is enforced server-side and mirrored
in UI navigation.

| Role | Route(s) | Scope | Headline decisions |
|---|---|---|---|
| Director / Head | `/principal/analytics` (7 tabs) | whole school | targets vs actual, forecast, risk summary, finance, scenarios |
| School admin | `/app/analytics/admin` | whole school (no safeguarding) | admissions funnel, enrolment, capacity, data quality, report centre |
| Deputy (vie scolaire) | `/app/analytics/vie-scolaire` | attendance operations | hot spots, lateness, unjustified backlog, intervention outcomes |
| Teacher | `/teacher/analytics` | own classes only | distribution vs cohort, item diagnostics, students to watch (supportive) |
| Parent | `/parent/analytics` | own children only | child progress, attendance pattern, “what you can do” |
| Student | `/student/analytics` | self only | own progress, goals, non-pressuring streaks |
| Finance | `/finance/analytics` | finance aggregates | collection, ageing, forecast, reminder effectiveness |
| HR / IT / Librarian / Reception | light dashboards | aggregate only | absence/cover, auth trends, loans, visitor flow |
| Group admin | `/app/analytics/group` | cross-school aggregates, normalised | distribution comparison, outlier caveats, no ranking |
| Auditor / Inspector | `/audit/analytics` | read-only aggregates + exports | register timeliness, completeness, access/AI stats |
| Data Analyst (new) | `/analyst` | pseudonymised student-level within school, no direct identifiers, step-up for export | Explore workspace, safe query builder, saved reports |

**Implementation note (2026-11-17):** the routes above are the conceptual per-role entry points
from the design. The shipped web app uses two governed routes — `/app/analytics` (role-scoped
dashboard variant selected from the API role) and `/app/analytics/explore` (analyst workspace) —
plus `/ui-kit/analytics` for primitive review. Role-specific tab sets remain a follow-up
(`GAP_REPORT.md`, A4).

---

## 7. Chart catalogue (colour-blind-safe, Part 6 palette)

Charts are drawn from `--chart-*` tokens (navy/royal/sky), never raw colours. Every chart is a
`ChartCard`: title-as-question, filter subtitle, freshness badge, “Explain this chart”, export,
fullscreen and a table alternative. Colour is never the only signal (direct labels + patterns).

| Chart | Answers | Used for |
|---|---|---|
| Line/area + confidence band | “Is attendance improving, and how sure are we?” | trends, forecast |
| Bar / stacked / diverging | “How does each period compare with the target?” | benchmarks, value-added |
| Histogram (fixed bins) | “Are marks clustered at the ceiling/floor?” | mark distribution |
| Box plot / violin-lite | “How spread are marks, and where is the median?” | subject distributions |
| Scatter + trendline + CI | “Is attendance associated with attainment?” | binned/authorised scatter |
| Heatmap (weekday × period, class × subject) | “Where are the hot spots?” | attendance, pass matrix |
| Calendar heatmap | “Which days are unusual?” | absence calendar |
| Funnel / retention triangle | “Where do we lose pupils/collection?” | chronic funnel, cohort, finance |
| Bullet chart | “Are we on track for the target?” | targets & goals |
| Sparkline / small multiples | “How is each class moving?” | progress ladders, class multiples |
| Waterfall | “What explains the change?” | change decomposition |
| Sankey-lite (optional) | “How do bands shift over time?” | progression |
| Radar (≤6 axes) | “How does a class profile look?” | profile comparison |
| ProgressRing / gauge | “What share of the goal is met?” | collection, completion |

Accessibility: tooltips with exact value + `n`; keyboard navigation; `aria-label` summary; table
alternative; reduced-motion; light/dark; mobile horizontal scroll with sticky labels; loading
skeletons; error + retry. Cross-filtering on click; brush-to-select date range; hover-highlight;
pin/save/share views; print/PDF stylesheet.

---

## 8. Statistical methods (implemented in `packages/analytics-core`, tested)

| Need | Method | Rule |
|---|---|---|
| Proportion CI | Wilson score 95% | always for rates; show low-sample badge when `n < nMin` |
| Mean CI | t-based 95%; bootstrap when `n < 30` or skew | show `n` + method |
| Trend | moving average (window 3/5), seasonality-aware comparison (same term/week-of-year) | compare like with like |
| Change point | largest absolute step vs rolling baseline | wording: “changed by X pts, within normal variation” when CI crosses 0 |
| Effect size | Cohen's d / point-biserial r / slope β | always with correlation views |
| Value-added | OLS residual from prior attainment, β ∈ [0,1.2], CI, aggregate only | intake banner; no staff ranking |
| Forecast | seasonal naive + exponential smoothing (explainable baselines) | prediction intervals, backtest MAPE, “estimate, not fact”, model logged |
| Risk | rule-based transparent weighted factors | weights visible + configurable; no black box |

Golden fixtures with hand-computed values live in
`packages/analytics-core/src/__tests__/golden.test.ts` and `services/api/src/test/resources/analytics/`.
Property tests assert aggregation invariants (class counts sum to school counts). No statistic
is introduced without a dictionary entry and a test.

**Insight engine** (rule-based, tested): sudden attendance drop, rising lateness, class below
cohort with adequate `n`, ceiling/floor effects, too-hard/too-easy assessment, homework decline,
data-quality gaps, collection-rate risk. Insights carry severity, evidence, suggested action,
“why am I seeing this”, dismiss/snooze per user, deduplication. Optional AI narrative summarises
already-computed aggregates only.

---

## 9. Performance plan

- **Pre-aggregation**: facts are computed by the refresh job; dashboard reads are simple selects.
- **Indexes**: `school_id` + grain columns; cover common filters (term, class, subject, date).
- **Caching**: tenant-scoped keys (`analytics:{schoolId}:{role}:{filtersHash}`), short TTL,
  invalidated on refresh; no cross-tenant cache bleed.
- **Targets**: p95 < 400 ms for dashboard queries at 5,000 students × 5 years; refresh job
  < 60 s incremental; chart render ≤ 100 ms for 1,000 points; initial analytics JS budget
  documented and enforced per route; export jobs async.
- **Load test**: perf profile seeds 5,000 students × 5 years; k6-style script asserts p95.
- **Frontend**: route-level `React.lazy` chart libraries, virtualised tables, lazy render on
  intersection; skeletons; CLS budget from Part 2 retained.

---

## 10. Known gaps (honest)

1. **Upstream facts absent** (no DB attendance/grade/finance tables). All demo analytics use the
   flagged mock adapter; real data drops in behind identical contracts once Part 3 epics land.
2. **Refresh job has no real source yet** — it records `sourceAvailable = false` rather than
   fabricating rows.
3. **Special-category and profiling features** need DPO/legal review before real data
   (chronic flag, support composite, fairness panel, any enabled gender/age dimension).
4. **Materialised views not used** (ordinary tables chosen so the RLS catalog test polices them);
   an explicit MV policy test would be needed if that changes.
5. **Export rendering libraries** (XLSX/PDF) are not yet in the dependency allow-list, and object
   storage is deliberately unwired. The governed facade ships an async, step-up-gated CSV job
   with watermark + idempotency; XLSX/PDF and download files are flagged in `GAP_REPORT.md`.
6. **Backtest accuracy** for collection forecast is computed on synthetic demo history; real
   accuracy is unknown until real data exists.
7. **Load/perf and axe/browser coverage** is partial. The analytics Playwright suite ran locally
   (7 passed, 1 intentionally skipped) and captured screenshots; the 5,000-student p95 load test
   and a full axe audit are still targets, not measured results. See
   `docs/PHASE_REPORTS/analytics.md`.

---

## 11. Decisions log (also appended to `DECISIONS.md`)

- **A8-1** Use ordinary RLS-forced tables (not MVs) for aggregates so `RlsCatalogCheckTest` covers them.
- **A8-2** Implement `analytics-core` in TypeScript (shared by mock adapter + UI) with golden tests;
  mirror the same formulae in Java for the governed API and share fixture JSON across languages.
- **A8-3** Default suppression threshold 5, configurable 3–20 by head/admin only; applied before
  serialisation on every view to prevent differencing.
- **A8-4** Add a minimal Spring `@Scheduled` refresh job (no new broker); no upstream source today
  → explicit `sourceAvailable = false`, never fabricated rows.
- **A8-5** Demo data is generated by a flagged mock adapter with identical contracts; no
  production code path invents numbers.
- **A8-6** Supports-only risk language; chronic flag/composite/fairness are DPO-review gated.
