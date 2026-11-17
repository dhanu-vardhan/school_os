# Metric dictionary — SchoolOS analytics (single source of truth)

**Version:** `1.0.0` (analytics Phase 1, 2026-11-17)
**Status:** authoritative for every analytics surface (API, UI, exports, insight engine, AI narratives).
**Rule:** if a number is displayed, its `metric.id` from this dictionary must be present in the
response `meta.metricIds`. No ad-hoc aggregates in screens. Every formula here has a golden test
in `packages/analytics-core/src/__tests__/golden.test.ts` (TS) and mirrored Java fixtures in
`services/api/src/test/resources/analytics/`.

> **Caveat that applies to every metric:** these are decision-support descriptions of what
> happened, never explanations of why, and never judgements about a child or a teacher. An
> association is not causation. Every value is shown with `n`, a freshness timestamp and, where
> applicable, an uncertainty interval. Groups below the suppression threshold (`n < 5`) are never
> rendered — see `ANALYTICS_DESIGN.md` §5.

---

## 1. Conventions used in this document

| Field | Meaning |
|---|---|
| `id` | Stable dotted identifier, `domain.name`. Never rename; add `v2` variants instead. |
| `name FR/EN` | Label shown in the UI and export headers. |
| `definition` | Plain language, reading level ≈ 12 years for parent/student surfaces. |
| `formula` | Exact, testable computation. `Σ` sums, `n` denominator count. |
| `grain` | Smallest unit at which the metric is computed before display aggregation. |
| `unit` | `ratio` (0–1), `percent`, `points` (mark scale), `minutes`, `count`, `rate/year`. |
| `good` | `↑` higher is better, `↓` lower is better, `→` neutral/context only. |
| `n_min` | Minimum sample size for display. Below this: `lowSample` badge + interval, never a point estimate presented as precise. |
| `roles` | Allowed role keys (see `packages/shared/src/access/roles.ts`). Deny by default. |
| `caveats` | Mandatory wording or limitations attached to the rendered value. |

**Notation.** A *school day* is a date where the school is open according to the zone C calendar
(`calendar_school_day.is_open = true`). Non-school days, weekends and holiday periods are excluded
from all attendance denominators. An *excused* (justified) absence has an accepted justification
within the configured lag; a *dispensed* mark (`is_dispensed = true`) is excluded from mark
denominators. Marks are normalised to a `/20` scale before aggregation unless stated.

**Suppression.** `n_min` is a *display* floor; the query engine additionally suppresses any cell
where `n < SUPPRESSION_THRESHOLD` (default 5). The two are independent: a metric may require a
larger sample (`n_min = 10`) for a stable interval, but a group of 3 is suppressed regardless.

---

## 2. Attendance metrics

### `attendance.rate`
- **name FR/EN:** Taux de présence / Attendance rate
- **definition:** The share of expected half-days that a pupil (or group) was actually present.
- **formula:** `present_half_days / expected_half_days`, where `expected = Σ open school days × sessions_per_day`, minus excused closures for the individual.
- **grain:** student × school day × session → aggregated to any group.
- **unit:** percent · **good:** ↑ · **n_min:** 20 half-days (group default 10 students).
- **roles:** all (parent/student scoped to self/own child).
- **caveats:** Excused absences count as *not present* here but are shown separately via `attendance.justified_rate`; the companion metric `attendance.rate_incl_excused` is available for contexts that count authorised absence as attendance. Distance learning days count as present when a register is taken.

### `attendance.unjustified_rate`
- **name FR/EN:** Taux d'absence injustifiée / Unjustified absence rate
- **definition:** Share of expected half-days missed with no accepted justification.
- **formula:** `unjustified_absence_half_days / expected_half_days`.
- **grain:** student × session · **unit:** percent · **good:** ↓ · **n_min:** 20.
- **roles:** director, school_admin, deputy, teacher (own classes), parent (own child), student (self), analyst, auditor.
- **caveats:** A pending justification is *unjustified until accepted*; the lag metric shows how often this is administrative delay. Supportive framing only.

### `attendance.justified_rate`
- **name FR/EN:** Taux d'absence justifiée / Justified absence rate
- **definition:** Share of expected half-days missed with an accepted justification (illness, family event, authorised activity).
- **formula:** `justified_absence_half_days / expected_half_days`.
- **grain:** student × session · **unit:** percent · **good:** → · **n_min:** 20.
- **roles:** as `attendance.unjustified_rate`.
- **caveats:** Health-related categories are stored as a binary *justified* flag only; no diagnosis or special-category reason is available to analytics. `TODO(DPO review)` confirm the aggregate-only justification-category breakdown is lawful before enabling.

### `attendance.lateness_rate`
- **name FR/EN:** Taux de retard / Lateness rate
- **definition:** Share of expected sessions where the pupil arrived after the register closed.
- **formula:** `late_sessions / expected_sessions`.
- **grain:** student × session · **unit:** percent · **good:** ↓ · **n_min:** 20.
- **roles:** director, school_admin, deputy, teacher (own classes), parent (own child), student (self), analyst, auditor.
- **caveats:** Register-close times are per-session configuration; changes are annotated on trend charts.

### `attendance.avg_minutes_late`
- **name FR/EN:** Retard moyen (minutes) / Average minutes late
- **definition:** Mean number of minutes late across late arrivals only.
- **formula:** `Σ minutes_late / count(late_sessions)`; t-based 95% CI (or bootstrap when `n < 30`).
- **grain:** student × late session · **unit:** minutes · **good:** ↓ · **n_min:** 10 late events.
- **roles:** as `attendance.lateness_rate`.
- **caveats:** Excludes justified late passes. Reported with `n` of late events, not of all sessions.

### `attendance.chronic_flag`
- **name FR/EN:** Repérage absence chronique / Chronic absence flag
- **definition:** A *support flag* raised when attendance over a rolling window is below a configurable cutoff. Default `< 90%` over the last 4 rolling weeks; head/admin may configure 95/90/85/80 for scenario planning.
- **formula:** `rolling_attendance_rate(window=28d) < threshold`. Boolean per student; counts aggregated.
- **grain:** student × snapshot date · **unit:** boolean/count · **good:** ↓ · **n_min:** 20 expected half-days in window.
- **roles:** director, school_admin, deputy, teacher (own classes, names only with `student.read`), analyst (pseudonymous), auditor (count only); **never** parent/student for other children.
- **caveats:** Rule-based threshold, not a prediction or a diagnosis. Supportive language: “needs support”, never “at risk student”. Every flagged list shows *why* (missing days, threshold, window), a false-positive feedback button, an owner and an outcome log. `TODO(DPO review)` profiling-like feature — lawful-basis and fairness review required before real data.

### `attendance.streak`
- **name FR/EN:** Série d'absence / Absence streak
- **definition:** Consecutive school days absent (max run length in the window).
- **formula:** `max(run_length(absence_day = true))` over consecutive *open* school days.
- **grain:** student × window · **unit:** days · **good:** ↓ · **n_min:** 10 open days in window.
- **roles:** as `attendance.chronic_flag` (student sees own streak as a non-pressuring reminder only).
- **caveats:** Holiday breaks split streaks (they are non-school days). A streak is a prompt to check in, never an automated action.

### `attendance.weekday_period_distribution`
- **name FR/EN:** Répartition jour/séquence / Weekday × period distribution
- **definition:** Absence and lateness rates by weekday and timetable period, used to find hot spots.
- **formula:** group `attendance.rate` and `attendance.lateness_rate` by `(weekday, period)`.
- **grain:** session · **unit:** percent matrix · **good:** → · **n_min:** 10 sessions per cell.
- **roles:** director, school_admin, deputy, teacher (own classes), analyst, auditor.
- **caveats:** Cells below threshold are suppressed and merged into a “other periods” band with its own `n`; never re-identify by filtering around a suppressed cell.

### `attendance.monday_friday_effect`
- **name FR/EN:** Effet lundi/vendredi / Monday–Friday effect
- **definition:** Difference in absence rate on Mondays (or Fridays) versus the Tuesday–Thursday baseline.
- **formula:** `rate(weekday ∈ {Mon,Fri}) − rate(weekday ∈ {Tue,Wed,Thu})`, with a seasonality-aware CI comparing the same term/week-of-year where possible.
- **grain:** week × weekday · **unit:** percentage points · **good:** ↓ · **n_min:** 6 weeks.
- **roles:** director, school_admin, deputy, analyst, auditor.
- **caveats:** Reported with absolute change, CI and “within normal variation” wording when the interval crosses zero.

### `attendance.post_holiday_dip`
- **name FR/EN:** Baisse après les vacances / Post-holiday return dip
- **definition:** Change in attendance in the first three open school days after a zone C holiday versus the preceding four weeks' baseline.
- **formula:** `rate(first 3 open days after holiday) − rate(preceding 28d)`, paired by term.
- **grain:** holiday event × group · **unit:** percentage points · **good:** ↓ · **n_min:** 2 holiday events, 20 students.
- **roles:** director, school_admin, deputy, analyst, auditor.
- **caveats:** Holiday dates come from `fr-holidays-zone-c.json`; unplanned closures are annotated separately.

### `attendance.justification_lag`
- **name FR/EN:** Délai de justification / Absence-to-justification lag
- **definition:** Median days between an unjustified absence and an accepted justification (or “still pending”).
- **formula:** `median(justified_at − absence_date)` in school days, with IQR.
- **grain:** absence event · **unit:** school days · **good:** ↓ · **n_min:** 10 justified absences.
- **roles:** director, school_admin, deputy, analyst, auditor.
- **caveats:** A long lag is often an administrative-process issue, not pupil behaviour; say so in the insight.

---

## 3. Marks & assessment metrics

### `marks.weighted_average`
- **name FR/EN:** Moyenne pondérée / Weighted average
- **definition:** Mean of marks after applying each assessment's coefficient, on a `/20` scale.
- **formula:** `Σ(mark_normalised_20 × coefficient) / Σ(coefficient)` over non-dispensed, present marks.
- **grain:** student × assessment → aggregated to class/subject/term.
- **unit:** points /20 · **good:** ↑ · **n_min:** 3 assessments.
- **roles:** all (scoped); parent/student see own child/self only.
- **caveats:** Absent marks are excluded (not zero) and called out in the explain payload. `is_dispensed` marks are excluded. Scale normalisation uses per-assessment `scale_max` and is shown in the explain panel.

### `marks.median`
- **name FR/EN:** Médiane / Median
- **definition:** The middle mark of the distribution, robust to outliers.
- **formula:** 50th percentile of normalised marks.
- **grain:** group × subject × term · **unit:** points /20 · **good:** ↑ · **n_min:** 5 marks.
- **roles:** all (scoped).
- **caveats:** Shown alongside the mean when skew is detected; never replace `n`.

### `marks.std_dev`
- **name FR/EN:** Écart-type / Standard deviation
- **definition:** How spread out the marks are around the mean.
- **formula:** sample standard deviation `sqrt(Σ(x−x̄)²/(n−1))`.
- **grain:** group × subject × term · **unit:** points /20 · **good:** → · **n_min:** 5 marks.
- **roles:** director, school_admin, deputy, teacher (own classes), analyst, auditor; parent/student see group spread only when `n ≥ 10` and no individual is identifiable.
- **caveats:** High spread may reflect different cohorts, not teaching quality.

### `marks.percentile_band`
- **name FR/EN:** Bande de percentile / Percentile band
- **definition:** Position of a mark within the cohort distribution (e.g. P25–P75 band).
- **formula:** linear-interpolated percentile rank; bands P10/P25/P50/P75/P90.
- **grain:** group × subject × term · **unit:** percentile · **good:** → · **n_min:** 20 marks.
- **roles:** as `marks.std_dev`.
- **caveats:** Cohort-relative, not absolute; never used to label a child.

### `marks.pass_rate`
- **name FR/EN:** Taux de réussite / Pass rate
- **definition:** Share of marks at or above the pass threshold. Default `≥ 10/20`, configurable per school/level.
- **formula:** `count(mark_normalised_20 ≥ pass_threshold) / count(assessed marks)`.
- **grain:** student × assessment → group × subject × term.
- **unit:** percent · **good:** ↑ · **n_min:** 5 marks.
- **roles:** all (scoped).
- **caveats:** Wilson 95% CI always shown. Threshold changes are annotated; “dispensed” marks excluded.

### `marks.distribution`
- **name FR/EN:** Distribution des notes / Mark distribution
- **definition:** Histogram of marks in configurable bins (default 2-point bins on /20).
- **formula:** `hist(mark_normalised_20, bins)`; ceiling/floor effect flag when >30% in top/bottom bin.
- **grain:** group × subject × term · **unit:** count/bin · **good:** → · **n_min:** 10 marks.
- **roles:** all (scoped).
- **caveats:** Bins are fixed across comparisons; do not re-bin between periods.

### `marks.progression`
- **name FR/EN:** Progression / Progression
- **definition:** Change in a group's (or pupil's) weighted average from one term to the next.
- **formula:** `mean(term T) − mean(term T−1)`, paired by student where possible; seasonality-aware comparison uses the same term in the prior year.
- **grain:** student × term → group × term · **unit:** points /20 · **good:** ↑ · **n_min:** 5 students.
- **roles:** all (scoped).
- **caveats:** paired vs unpaired method shown in explain payload; differences may reflect intake and group size.

### `marks.value_added`
- **name FR/EN:** Progression ajustée / Value-added (progress)
- **definition:** Transparent residual: actual current mark minus the mark expected from prior attainment. Intentionally simple — no opaque model.
- **formula:** `residual = actual_mean_term_T − (α + β × prior_mean_term_T−1)` where `α, β` are fitted on the whole cohort by OLS; reported with t-based CI and `n`. `β` bounded to `[0, 1.2]`.
- **grain:** class/subject × term (aggregate only — never an individual teacher score).
- **unit:** points /20 · **good:** ↑ · **n_min:** 15 students, 2 terms.
- **roles:** director, school_admin, deputy, analyst, auditor; **never** parent/student; teachers see only their own class aggregate with context.
- **caveats:** Mandatory banner: “Differences may reflect intake and group size; this is not a measure of teacher quality. No individual staff ranking is produced.” Aggregate only, suppressed below threshold.

### `marks.benchmark_comparison`
- **name FR/EN:** Comparaison de référence / Benchmark comparison
- **definition:** A group's metric versus class, cohort and school benchmarks.
- **formula:** `group_value − benchmark_value` for the same term and metric; CI of the difference.
- **grain:** group × term · **unit:** points/percentage points · **good:** depends on base metric · **n_min:** 10 per group.
- **roles:** director, school_admin, deputy, teacher (own class vs cohort), analyst, auditor.
- **caveats:** No cross-teacher ranking; benchmark is context, not a target.

### `assessment.difficulty`
- **name FR/EN:** Difficulté de l'évaluation / Assessment difficulty
- **definition:** Proportion of pupils answering a quiz item correctly (p-value); used to find too-hard/too-easy questions.
- **formula:** `p = correct_count / attempted_count` per item.
- **grain:** quiz item × cohort · **unit:** ratio · **good:** → (target ~0.5–0.8) · **n_min:** 10 attempts per item.
- **roles:** teacher (own classes), director, school_admin, analyst, auditor.
- **caveats:** Item analysis is a teaching aid, never a pupil score. Suppressed items with low attempts.

### `assessment.discrimination`
- **name FR/EN:** Pouvoir discriminant / Item discrimination
- **definition:** How well an item separates high and low performers (point-biserial correlation with total, excluding the item).
- **formula:** `corr(item_binary, total_excluding_item)`; report effect size and `n`.
- **grain:** quiz item × cohort · **unit:** correlation · **good:** ↑ (target > 0.2) · **n_min:** 15 attempts.
- **roles:** as `assessment.difficulty`.
- **caveats:** “association, not causation”; small-sample items are flagged low-sample.

### `marks.grade_inflation`
- **name FR/EN:** Dérive des notes / Grade drift (aggregate)
- **definition:** Year-over-year change in mean marks across the whole school, to detect drift.
- **formula:** `mean(year T) − mean(year T−1)` on a common subject/assessment mix; age-standardised where possible.
- **grain:** school × year × subject · **unit:** points /20 · **good:** → · **n_min:** 2 years, 100 marks/year.
- **roles:** director, school_admin, group_admin (normalised cross-school), analyst, auditor.
- **caveats:** Aggregate only, no cohort mixing; differences may reflect assessment-mix changes. No conclusion about inflation without review.

---

## 4. Engagement metrics

### `engagement.homework_completion_rate`
- **name FR/EN:** Taux de rendu des devoirs / Homework completion rate
- **definition:** Share of assigned homework submitted (any time).
- **formula:** `submitted_assignments / assigned_assignments`.
- **grain:** student × assignment → group.
- **unit:** percent · **good:** ↑ · **n_min:** 5 assignments.
- **roles:** director, school_admin, deputy, teacher (own classes), parent (own child), student (self), analyst, auditor.
- **caveats:** Exempted assignments excluded; explain payload lists exclusions.

### `engagement.on_time_submission_rate`
- **name FR/EN:** Taux de rendu dans les délais / On-time submission rate
- **definition:** Share of submitted homework that met the deadline.
- **formula:** `submitted_before_due / submitted`.
- **grain:** student × assignment · **unit:** percent · **good:** ↑ · **n_min:** 5 submissions.
- **roles:** as `engagement.homework_completion_rate`.
- **caveats:** Late passes/extensions recorded and excluded when granted before the deadline.

### `engagement.message_response_time`
- **name FR/EN:** Délai de réponse / Message response time
- **definition:** Median time from a parent/teacher message to the first reply, by role group (aggregate).
- **formula:** `median(first_reply_at − sent_at)`; IQR; grouped by sender/recipient role, never named individuals.
- **grain:** message thread · **unit:** hours · **good:** ↓ · **n_min:** 10 threads.
- **roles:** director, school_admin, analyst, auditor; **no** individual staff ranking.
- **caveats:** Working-hours adjustment configurable; no staff performance conclusions.

### `engagement.portal_activity`
- **name FR/EN:** Activité du portail / Parent portal activity
- **definition:** Aggregate weekly active parent accounts as a share of linked guardians.
- **formula:** `distinct_guardians_with_session(7d) / distinct_linked_guardians`.
- **grain:** school × week · **unit:** percent · **good:** → · **n_min:** 20 guardians.
- **roles:** director, school_admin, analyst, auditor.
- **caveats:** Aggregate only; no per-family surveillance. Session events contain no child data.

---

## 5. Combined / decision-support metrics

### `combined.attendance_attainment`
- **name FR/EN:** Présence et résultats / Attendance–attainment relationship
- **definition:** Association between attendance bands and average marks, shown as bins (never a student-level scatter for unauthorised roles).
- **formula:** bin by `attendance.rate` (e.g. `<85, 85–90, 90–95, 95+`) and compute `marks.weighted_average` per bin; scatter with trendline + CI only for authorised roles.
- **grain:** student → band → aggregate · **unit:** points /20 · **good:** → · **n_min:** 20 per band.
- **roles:** director, school_admin, deputy, analyst, auditor; teacher own classes (bins only); parent/student own data only.
- **caveats:** Mandatory sentence **“association, not causation”** plus effect size and `n`. No claim that attendance *causes* marks.

### `combined.risk_composite`
- **name FR/EN:** Indicateur de soutien / Support-needs composite (transparent)
- **definition:** A rule-based, explainable sum of weighted, transparent factors used to prompt a human check-in — not a prediction or a score about a child.
- **formula:** `Σ(weight_i × factor_i)` with visible factors: chronic absence flag, unjustified rate above threshold, homework completion below threshold, mark drop vs prior term. Default weights `0.4/0.25/0.2/0.15`, configurable by head/admin. Each factor and weight is shown in “why flagged”.
- **grain:** student × snapshot · **unit:** 0–1 index · **good:** ↓ · **n_min:** 20 expected half-days + 3 marks.
- **roles:** director, school_admin, deputy, teacher (own classes), analyst (pseudonymous); **never** parent/student (they see supportive suggestions, no label).
- **caveats:** Rule-based, no black box, no automated decision. Supportive copy (“needs support”). False-positive feedback, owner, outcome log required. `TODO(DPO review)` profiling-like — fairness check mandatory.

### `combined.cohort_retention`
- **name FR/EN:** Suivi de cohorte / Cohort retention
- **definition:** Share of a starting cohort still enrolled at each later year (retention triangle).
- **formula:** `count(enrolled_at_year_T) / count(enrolled_at_year_0)` by cohort.
- **grain:** cohort × year · **unit:** percent · **good:** ↑ · **n_min:** 20 in cohort.
- **roles:** director, school_admin, group_admin (normalised), analyst, auditor.
- **caveats:** Leavers for lawful reasons (move, transfer) are not failure; shown as context.

### `combined.subject_pass_matrix`
- **name FR/EN:** Matrice de réussite / Subject pass-rate matrix
- **definition:** Pass rate for each class × subject cell.
- **formula:** `marks.pass_rate` grouped by `(class, subject)`.
- **grain:** class × subject × term · **unit:** percent · **good:** ↑ · **n_min:** 10 marks/cell.
- **roles:** director, school_admin, deputy, teacher (own classes' cells), analyst, auditor.
- **caveats:** Suppressed cells below threshold; no teacher names in cells.

---

## 6. Operations & finance metrics (aggregate)

### `finance.collection_rate`
- **name FR/EN:** Taux de recouvrement / Fee collection rate
- **definition:** Share of invoiced fees collected in the period.
- **formula:** `amount_collected_cents / amount_invoiced_cents` (integer cents).
- **grain:** school × period · **unit:** percent · **good:** ↑ · **n_min:** 20 invoices.
- **roles:** director, school_admin, finance, accountant, group_admin (normalised), analyst, auditor.
- **caveats:** Written-off and credited invoices excluded and disclosed in the explain payload.

### `finance.overdue_ageing`
- **name FR/EN:** Ancienneté des impayés / Overdue ageing
- **definition:** Outstanding amounts bucketed by days past due (0–30/31–60/61–90/90+).
- **formula:** `SUM(outstanding_cents)` grouped by `age_bucket = today − due_date`.
- **grain:** invoice → bucket · **unit:** money (cents) · **good:** ↓ · **n_min:** 20 invoices.
- **roles:** finance, accountant, director, school_admin, analyst, auditor.
- **caveats:** Family-level arrears lists restricted to finance; no public ranking of families.

### `finance.collection_forecast`
- **name FR/EN:** Prévision de recouvrement / Collection forecast
- **definition:** Explainable estimate of fees likely to be collected by period end, with prediction interval.
- **formula:** seasonal-naive baseline + exponential smoothing on collected amounts; backtest accuracy (MAPE) shown; prediction interval 80%/95%.
- **grain:** school × week · **unit:** money (cents) · **good:** → · **n_min:** 8 weeks history.
- **roles:** finance, accountant, director, school_admin, analyst, auditor.
- **caveats:** “Forecast is an estimate, not a fact”; model id/version logged to model registry; never used to make automatic decisions about families.

### `ops.cost_per_student`
- **name FR/EN:** Coût par élève / Cost per student
- **definition:** Only when cost data exists: total operating cost divided by enrolled students.
- **formula:** `Σ cost_cents / count(enrolled_students)`.
- **grain:** school × year · **unit:** money (cents) · **good:** → · **n_min:** 50 students.
- **roles:** director, school_admin, finance, group_admin (normalised), auditor.
- **caveats:** **Not available in demo** — no cost ledger. Endpoint returns `available: false`; UI hides the card rather than showing zero.

---

## 7. Data-quality metrics

### `dq.register_timeliness`
- **name FR/EN:** Ponctualité des registres / Register timeliness
- **definition:** Share of expected registers taken before the configured cutoff.
- **formula:** `registers_before_cutoff / expected_registers`.
- **grain:** class × session × day · **unit:** percent · **good:** ↑ · **n_min:** 20 registers.
- **roles:** director, school_admin, deputy, analyst, auditor; teacher sees own classes only.
- **caveats:** Late registers are a process signal, not a teacher performance score.

### `dq.mark_entry_completeness`
- **name FR/EN:** Complétude des notes / Mark-entry completeness
- **definition:** Share of assessments with all expected marks entered (excluding dispensed).
- **formula:** `entered_marks / expected_marks`.
- **grain:** assessment × class · **unit:** percent · **good:** ↑ · **n_min:** 5 assessments.
- **roles:** as `dq.register_timeliness`.
- **caveats:** Excludes pupils with approved dispensation; exclusions shown.

### `dq.anomaly_count`
- **name FR/EN:** Anomalies / Anomaly count
- **definition:** Count of flagged data anomalies (duplicate students, impossible dates, orphaned marks) by type.
- **formula:** `count(result of dq_rule_* checks)` grouped by rule.
- **grain:** school × rule · **unit:** count · **good:** ↓ · **n_min:** n/a (count only, suppressed groups apply).
- **roles:** director, school_admin, analyst, auditor.
- **caveats:** Counts only, no personal data in the list; drill-down requires `student.read` and is audited.

### `dq.guardian_coverage`
- **name FR/EN:** Couverture des responsables / Guardian coverage
- **definition:** Share of enrolled students with at least one linked, contactable guardian.
- **formula:** `count(students_with_guardian) / count(enrolled_students)`.
- **grain:** school × grade band · **unit:** percent · **good:** ↑ · **n_min:** 20 students.
- **roles:** director, school_admin, deputy, analyst, auditor.
- **caveats:** “Contactable” means a verified channel; no guardian identity shown in analytics.

---

## 8. Metric → chart catalogue mapping

| Metric id(s) | Recommended chart(s) | Required companion |
|---|---|---|
| `attendance.rate`, `marks.pass_rate` | Bullet (target vs actual), trend + CI band | n + freshness + Wilson CI |
| `attendance.weekday_period_distribution` | Heatmap (weekday × period) | suppression legend |
| `attendance.streak`, `attendance.chronic_flag` | Calendar heatmap, funnel at 95/90/85/80 | “why flagged” + owner |
| `attendance.post_holiday_dip`, `attendance.monday_friday_effect` | Annotated line, small multiples | change-point wording |
| `marks.distribution`, `marks.percentile_band` | Histogram, box plot | fixed bins + n |
| `marks.value_added` | Diverging bar + CI | intake banner + n |
| `marks.progression` | Slope chart, sparklines | paired/unpaired note |
| `combined.attendance_attainment` | Binned scatter + trendline + CI | “association, not causation” |
| `finance.collection_rate`, `finance.overdue_ageing` | Funnel, waterfall, ageing stack | exclusions note |
| `dq.*` | Data-quality badge, bar by rule | no personal data |

---

## 9. Governance

- **Changing a metric** requires a version bump here, a migration of stored `metric_id` references, updated golden fixtures and a decision log entry in `DECISIONS.md`.
- **Adding a metric** requires: dictionary entry, TS + Java implementation, golden test, role mapping, UI explain copy FR/EN, and a traceability id.
- **Parameters** (chronic cutoff, pass threshold, suppression threshold, weights) are tenant configuration, never hard-coded in a query or screen. Defaults are recorded here and in `ANALYTICS_DESIGN.md`.
- **Special categories:** no ethnic, religious, health, disability or safeguarding attributes are available as dimensions. Gender/age-band/level are dimensions **only when the school enables them**, with suppression; this is `TODO(DPO/legal review)`.
