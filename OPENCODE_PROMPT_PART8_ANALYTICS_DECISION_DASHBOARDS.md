# OPENCODE PROMPT (PART 8): Advanced Analytics & Decision-Support Dashboards (Data-Analyst Layer)

> Continuation of Parts 1-7. Goal: add a **professional data-analytics layer** so each role gets dashboards for **analysis and decision making**, built mainly on **attendance, marks/grades, homework and (aggregate) behaviour/finance data**. This is full-stack but **read-only for analytics**: a governed data layer (aggregates, views, endpoints) plus a rich UI. Reuse the existing `analytics`, `ai/forecast`, `ai/eval`, `audit`, `compliancepack` packages, Part 6 design language, Part 2 Button/colour rules, Part 5/7 roles and access registry. Where upstream data (attendance, grades from Part 3 epics) is not built yet, build against the demo seed with a clearly flagged mock data adapter and keep the contracts identical so real data drops in later.

## ROLE
You are a senior data analyst + analytics engineer + product designer working together. Deliver dashboards a head teacher, teacher, parent, finance lead or inspector can actually **decide** from: every chart must answer a question, show uncertainty honestly, explain itself, and lead to an action. No vanity charts.

## STEP 0: DISCOVER (no questions to me)
Read `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/COMPLIANCE.md`, `docs/AI_GOVERNANCE.md`, `docs/AUTH_DESIGN.md`, `docs/ROLE_UI_MAP.md`, `docs/DESIGN_TOKENS.md`, `docs/PROGRESS.md`, `docs/FEATURE_PLAN.md`; the backend `analytics`, `ai/forecast`, `ai/eval`, `audit`, `tenancy`, `security` packages and migrations V1-V3+; `apps/web/src/demo/seed.ts`. Write `docs/ANALYTICS_DESIGN.md`: metric dictionary, data model, privacy rules, role-to-dashboard map, chart catalogue, statistical methods, performance plan, known gaps. Then implement.

---

## PART A: DATA & METRICS FOUNDATION

### A1. Metric dictionary (single source of truth, versioned)
Create `packages/shared/src/metrics/` and `docs/METRIC_DICTIONARY.md`. Each metric: id, name FR/EN, plain-language definition, formula, grain, inclusion/exclusion rules (e.g. excused absences, non-school days from zone C calendar, dispensed marks), unit, good-direction, minimum sample size, allowed roles, caveats. Core metrics:
- **Attendance**: attendance rate, unjustified absence rate, justified absence rate, lateness rate, average minutes late, chronic absence flag (e.g. < 90% attendance, configurable), absence "streaks", weekday/period distribution, Monday/Friday effect, post-holiday return dips, absence-to-justification lag.
- **Marks**: weighted average (coefficients, scale normalisation to /20), median, standard deviation, percentile bands, pass rate (>=10/20 configurable), distribution histograms, progression (term over term), **value-added/progress** vs prior attainment (simple, transparent: residual from expected based on previous term), class vs cohort vs school benchmarks, assessment difficulty/discrimination (item stats for quizzes), grade inflation indicator (mean drift over years, aggregate only).
- **Engagement**: homework completion rate, on-time submission rate, message response time (parents/teachers), parent portal activity (aggregate).
- **Combined**: attendance-attainment relationship, risk-factor composite (transparent weights shown), cohort retention/progression, subject pass-rate matrix.
- **Operations/finance (aggregate)**: fee collection rate, overdue ageing, collection forecast, cost-per-student indicators only if data exists.
- **Data quality**: completeness (registers taken on time, marks entered), timeliness, anomaly counts, duplicate students, missing guardians.

### A2. Backend analytics layer (read-only, tenant-safe)
- Flyway migration(s) adding **aggregate tables / materialized views** (daily attendance facts, assessment facts, student-term facts, cohort dimension tables) with `school_id` + **RLS** and added to `RlsCatalogCheckTest` + cross-tenant tests. Refresh via scheduled jobs (incremental where possible), idempotent, with `last_refreshed_at` exposed to the UI ("Data as of 08:15").
- Analytics REST endpoints under `/api/analytics/**`: parameters for date range, term/year, class, level, subject, cohort, comparison basis, grain; responses include `data`, `meta` (metric ids, sample sizes, confidence intervals where relevant, suppressed-cells flag, data freshness), pagination for tables, and **explain** payloads (inputs behind a flag/score).
- Authorisation through `PolicyService` + role scoping at **query time**: teacher -> own classes; parent -> own children; head/admin -> school; group admin -> aggregates across schools; auditor -> read-only aggregates; student -> own data. Deny-by-default; allow/deny policy tests per endpoint; every analytics access to student-level data is audited.
- **Privacy by design**: small-cell suppression (hide/merge groups with n < 5, configurable, never show "n=2" averages), no re-identification by differencing (apply the same suppression on filtered views), no individual **staff** performance rankings (only class/subject-level aggregates with context), exclude protected/special-category attributes (in France do **not** build ethnic/religious statistics; gender/age-band/level only if the school enables; special-needs, health and safeguarding data excluded or shown as aggregate counts with suppression and DPO flag), differential access to risk lists (only authorised roles), no analytics data in logs/URLs/notifications.
- Performance: p95 < 400 ms for dashboard queries at 5,000 students / 5 years (load test, index review, caching with tenant-scoped keys, pre-aggregation), export jobs async.
- Data export: CSV/XLSX/PDF for authorised roles with step-up (Part 5), watermark "Confidential" + generated-by + timestamp, audit record.

### A3. Statistical rigour (document in `docs/ANALYTICS_DESIGN.md`, implement in a tested `analytics-core` module, unit tests with known fixtures)
- Show **n** next to every aggregate; show **confidence intervals** for rates/means (Wilson for proportions, bootstrap or t-based for means) and a "low sample" badge instead of a confident-looking number.
- Trends: moving averages, seasonality-aware comparison (compare like with like: same term/week-of-year), change-point highlighting, **statistical vs practical significance** wording ("changed by 2.1 pts, within normal variation").
- Correlation views must carry the sentence "association, not causation", plus effect size and sample size. No claims about causes without explicit caveats.
- Forecasting (extend `ai/forecast`): simple, explainable baselines first (seasonal naive, exponential smoothing), prediction intervals, backtest accuracy shown, "forecast is an estimate" label; never presented as fact; model/version logged to the model registry.
- **Risk indicators are rule-based and transparent** (thresholds + weights visible and configurable by head/admin), with per-student "why flagged" explanations, false-positive feedback button, follow-up owner and outcome log. No black-box scoring, no automated decisions about students; UI copy is supportive ("needs support"), never punitive labels.
- Fairness check panel (aggregate): compare flag rates and support outcomes across allowed groups (level, class; others only if enabled) to detect unintended skew; shown to head/DPO only with suppression.

---

## PART B: DASHBOARD SYSTEM (UI)

### B1. Analytics UI kit (`packages/ui`, `/ui-kit/analytics`)
Colour-blind-safe chart set in the Part 6 navy/royal/sky palette with patterns and direct labels: line/area with confidence band, bar/stacked/diverging, histogram with bins, box plot, violin-lite, scatter with trendline + CI, heatmap (weekday x period, class x subject), calendar heatmap (attendance by day), funnel, cohort retention triangle, bullet chart (target vs actual), sparkline, small multiples, waterfall (change decomposition), Sankey-lite (progression between bands, optional), radar only for <= 6 comparable axes, gauge/ProgressRing, treemap (optional). Components: **MetricCard** (value, delta vs previous period/benchmark with arrow + colour + text, n, info popover with definition from the metric dictionary), **ChartCard** (title as a question or insight, subtitle with filters, data freshness, "Explain this chart", export, fullscreen, view-as-table toggle for accessibility), **InsightCard** (auto-generated plain-language finding with evidence link, e.g. "Attendance fell 4.2 pts on Mondays in Term 2; concentrated in 4e B"), **FilterBar** (global filters: period, term, level, class, subject, cohort, comparison basis; syncs to URL; saved views), **DrillDown** (breadcrumb path school -> level -> class -> student with permission checks), **CompareSelector**, **ThresholdEditor**, **AnnotationLayer** (holidays, assessments, events overlaid on time series), **DataQualityBadge**, **EmptyOrLowDataState**.
- Every chart: tooltips with exact values and n, keyboard navigation, `aria-label` summary, table alternative, reduced-motion, light/dark, mobile responsive (small multiples collapse, horizontal scroll with sticky labels), colour never the only signal, loading skeletons, error + retry.
- Interactions: cross-filtering (click a bar to filter the page), brush to select date range, hover-highlight series, pin/save view, share view link (permission-checked deep link), print/PDF stylesheet.

### B2. Insight engine (rule-based, explainable)
A tested module that scans metrics and emits ranked **insights** with severity, evidence, suggested action and link: sudden attendance drop, rising lateness in a period, class below cohort by more than X with adequate n, subject distribution skew (ceiling/floor effects), assessment too hard/easy (item stats), homework completion decline, data-quality gaps (registers not taken), collection-rate risk. Insights are dismissible/snoozable per user, deduplicated, and each carries "why am I seeing this". **AI narrative summaries** (optional, governed): summarise already-computed aggregates in plain language via redacted, aggregate-only input, labelled "AI-generated, review required", feature-flagged per school, quota-limited.

### B3. What-if & planning tools
- **Scenario simulator** (head/admin): adjust thresholds (e.g. chronic-absence cutoff) and see how many students/classes are affected; model "if attendance improved by X pts, expected change in average mark" shown as an *association-based estimate with wide caveats*; class size / grouping what-if for timetable planning (reads Epic 5 data when available).
- **Targets & goals**: set targets per metric/level/class with progress bullet charts and projected-to-hit-target forecast; alerts when off-track.
- **Intervention tracker**: from any flag, create a follow-up (owner, due date, action type), later see **before/after** outcome charts for supported cohorts with honest comparison caveats.

---

## PART C: ROLE-BY-ROLE ANALYTICS DASHBOARDS
Add an **Analytics** section to each role's nav (Part 7 registry entries with permissions `analytics:*`). Each dashboard: FilterBar, 4-6 MetricCards, 4-8 ChartCards, InsightCards, drill-down, export (where allowed), saved views, data-freshness badge, FR/EN.

1. **Principal / Head (decision dashboard)** (`/principal/analytics`):
   - *Executive overview*: attendance rate vs target and last year, pass rate, average by level, trend with annotations, forecast to year-end with interval, top insights (3-5), risk summary (counts per level, supportive tone), fee collection rate.
   - *Attendance deep-dive*: calendar heatmap, weekday x period heatmap, chronic-absence funnel (at 95/90/85/80%), unjustified vs justified, lateness by period, absence-to-justification lag, post-holiday dip analysis, cohort comparison, class small multiples.
   - *Academic performance*: distributions by subject/level (box plots), pass-rate matrix (class x subject), term-over-term progression, value-added by class/subject (with CI and n, aggregate, context banner "differences may reflect intake and group size"), grade inflation drift over years, assessment difficulty diagnostics.
   - *Attendance x attainment*: scatter (student-level hidden for non-authorised, aggregated to bins), band analysis ("pupils attending 95%+ average X vs 85-90% average Y"), with association caveat.
   - *Equity & support*: supportive risk list (authorised only), intervention outcomes, fairness check panel (aggregate).
   - *Operations & finance*: collection funnel, overdue ageing, forecast, register timeliness and data quality.
   - *Scenario & targets* tab.
2. **School admin**: operational analytics (admissions funnel conversion, enrolment by level and trend, capacity utilisation, attendance operations, data-quality dashboard, reports centre with scheduled export definitions UI).
3. **Vie scolaire**: lateness and absence analytics by day/period/class, unjustified backlog ageing, hot-spot classes/times, intervention outcomes, daily board with trend sparklines.
4. **Teacher**: *My classes* analytics only: class distribution vs cohort, assessment diagnostics (which questions/criteria were hardest), student progress ladders (sparklines per student), attendance by session, homework completion, "students to watch" with reasons and one-click message/follow-up, marking workload forecast. **No cross-teacher comparisons or rankings.**
5. **Parent**: simple, friendly, non-technical: child progress over time per subject (with class-average band only when n >= threshold), attendance summary + weekday pattern for their child, strengths/areas to improve in plain language (rule-based), "what you can do" suggestions, term comparison; reading-level-friendly copy; no peer identification.
6. **Student**: own progress, goal setting, streaks (non-pressuring), subject trends, attendance reminder; age-appropriate tone.
7. **Finance**: collection analytics, ageing, payment-method mix, forecast with intervals, family-level risk of arrears (rule-based, aggregate lists restricted to finance), reminder effectiveness (before/after reminder payment rates).
8. **HR / IT / Librarian / Receptionist** (light): HR: absence and cover rates (aggregate, no individual scoring), IT: auth/security trends from Part 5, Librarian: loans/overdue analytics, Receptionist: visitor flow by hour.
9. **Group admin**: cross-school benchmarking of **aggregates only** (normalised, with n and suppression), ranking-free comparison with distribution views, outlier detection with caveats.
10. **Auditor / Inspector (read-only)**: compliance-oriented analytics: register timeliness, data completeness, access-to-sensitive-data stats, AI usage stats, retention actions; exports with watermark.
11. **Data Analyst role (new)** (`/analyst`): add `data-analyst` role (documented permission set: read-only aggregated + pseudonymised student-level data within school, **no direct identifiers**, no sensitive categories, step-up for exports). Provide a **Report Builder / Explore workspace**: choose metric, dimension(s), filters, chart type; save/share reports; compare periods; pivot table; CSV export; SQL-free by design (safe query builder constrained to the metric dictionary), full audit of queries; pseudonymous student keys that reset per export.

---

## PART D: GOVERNANCE, QUALITY & TESTING
- **Audit & privacy tests**: suppression tests (n < threshold never rendered, differencing attempts blocked), role-scoping tests per endpoint (teacher cannot request another class; parent cannot request another child; analyst gets pseudonymised keys only), cross-tenant analytics tests, URL/filter tampering tests, export watermark and audit tests, no sensitive data in logs/URLs.
- **Correctness tests**: golden fixtures with hand-computed expected values for every core metric (attendance with excused/non-school days, weighted averages with coefficients and absent marks, value-added, CI calculations, forecast backtests); property tests for aggregation invariants (sums of class counts equal school counts).
- **Performance tests**: dashboard query p95 targets, refresh job duration, large-tenant seed (5,000 students x 5 years) in a perf profile; frontend: chart render budgets (<= 100 ms for 1,000 points, virtualised tables), lazy-load chart libraries per route, initial JS budget per analytics route documented.
- **Accessibility**: every chart has table view + text summary; keyboard focus order; contrast in both themes; axe zero serious; colour-blind simulation review of the chart palette.
- **UX tests (Playwright)**: filter -> URL sync -> reload restores view; drill-down path with permission denial; saved view share link access control; export flow with step-up; insight dismiss/snooze persistence; mobile layouts at 360/390/768.
- Extend `verify/features.yaml`, `docs/TRACEABILITY.md`, `docs/AI_GOVERNANCE.md` (narratives, forecasts), `docs/COMPLIANCE.md` (analytics data classification, suppression policy, **flag "needs DPO/legal review"** for any special-category or profiling-like feature, and note French rules on statistics of sensitive attributes), `docs/MODEL_REGISTRY.md`.

## DEMO DATA
Extend `DemoSeedRunner` (demo profile only) with **3 school years** of realistic synthetic data for the demo tenant: attendance with seasonality (winter dips, Monday/Friday effect, post-holiday dips from zone C), grades with class/teacher/subject variation, a few planted patterns so insights fire (e.g. Monday absence cluster in one class, a too-hard assessment, a cohort improving after an intervention), fee payment behaviour with seasonal lateness. Document planted patterns in `docs/DEMO_SCRIPT.md` so a demo can show each insight.

## BUILD ORDER (commit per phase; app stays runnable)
1. `ANALYTICS_DESIGN.md`, `METRIC_DICTIONARY.md`, shared metric definitions.
2. `analytics-core` (stats utilities, CI, suppression, insight rules) with golden tests.
3. Migrations for aggregates + RLS, refresh jobs, analytics endpoints + policy/audit tests, demo seed with 3 years.
4. api-client hooks + types, mock adapter parity.
5. Analytics UI kit + `/ui-kit/analytics` + FilterBar/URL sync/saved views.
6. Principal dashboard (all tabs), then Admin and Vie scolaire.
7. Teacher, Parent, Student dashboards (strict scoping, friendly copy).
8. Finance, Group, Auditor, light dashboards for HR/IT/Librarian/Receptionist.
9. Data Analyst role + Report Builder + exports with watermark/audit.
10. Insight engine UI, scenarios, targets, interventions tracker, optional governed AI narratives.
11. Performance, accessibility, privacy and correctness test passes; screenshots in `docs/design/screens/analytics/`; docs; honest phase report `docs/PHASE_REPORTS/analytics.md`.

## DEFINITION OF DONE
- Each role sees only its permitted analytics, with correct scoping enforced server-side and mirrored in the UI; no chart shows a group smaller than the suppression threshold; every aggregate shows n and freshness; uncertainty and association-vs-causation caveats are visible where relevant.
- Metrics match golden fixtures; `scripts/verify-all.sh`, RLS catalog test, policy/privacy tests, perf budgets, axe and Playwright suites all green; no raw colours; single Button system; FR/EN complete.
- Insights fire on the planted demo patterns and each links to evidence and an action; risk lists are explainable, supportive in tone, and audited.
- Docs updated and an honest gap list delivered, including items needing DPO/legal review and anything mocked.

## RULES OF ENGAGEMENT
- Decisions support humans: never auto-act on students, never rank teachers, never label children. Aggregate first, individual only for authorised roles with audit.
- If upstream data is missing, use the seeded mock adapter with identical contracts, flag it in `docs/FRONTEND_WIRING.md` and `docs/GAP_REPORT.md`; never fabricate numbers in production code paths.
- Do not invent statistics: every formula lives in the metric dictionary and has a test. Prefer simple, explainable methods over sophisticated opaque ones.
- Work autonomously; choose safe defaults, log them in `docs/DECISIONS.md`; leave a "resume here" note in `docs/PROGRESS.md` if you stop.

START NOW with STEP 0, then phase 1.
