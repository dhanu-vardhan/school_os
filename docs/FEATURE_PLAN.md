# Feature plan — Part 4 epics (21–44)

This document extends the Phase 1/2 feature plan. It is the planning source for
Part 4; `verify/features.yaml` is the executable coverage registry, and
`docs/PROGRESS.md` tracks delivery state. Epics continue numbering from EPIC 21.

## Conventions

- Every epic is a full-stack vertical slice unless explicitly marked docs/infra.
- New tenant tables: Flyway `V__` migration, forced RLS, school-isolation policy,
  index on `school_id`, registration in the retention catalogue where personal
  data is stored, cross-tenant test, policy allow/deny test.
- New API endpoints live under `/api/v1/...`; permissions are enforced in
  `PolicyService` (never only hidden in the UI).
- Screens use the Part 1/2 design system (tokens, single Button system,
  FR/EN i18n, accessibility AA, skeletons/optimistic UI).
- Governed AI: every suggestion is a draft requiring explicit human approval;
  redaction before any model call; no AI on safeguarding/SEN/health records.
- Feature flags hide unfinished navigation entries.

## Retention classes

| Class | Meaning | Default |
|---|---|---|
| `public` | School-published information | 10 years |
| `internal` | Operational school data | 5 years |
| `confidential-minor` | Individual pupil data | 3 years after leaving |
| `sensitive` | Health / SEN / safeguarding-adjacent | Shortest lawful; 1–3 years; DPO review required |
| `special` | Payment, identity evidence, legal documents | Per legal obligation; 5–10 years |

---

## Track A — Teaching & learning

### EPIC 21 — Lesson planner & resource library  `status: in progress`

- Entities: `lesson_plan`, `lesson_resource`, `lesson_plan_resource`,
  `curriculum_chapter`, `curriculum_coverage`.
- Endpoints: `GET/POST/PUT/DELETE /api/v1/lesson-plans`,
  `POST /api/v1/lesson-plans/{id}/copy`,
  `GET/POST /api/v1/lesson-resources`,
  `GET/POST /api/v1/curriculum/chapters`,
  `GET/POST /api/v1/curriculum/coverage`.
- Roles: teacher/deputy/director read+write; assistant read; instructor read.
- Screens: Planner (calendar-linked list + editor), Library (search/filters),
  Coverage (per-class progress bars), nav entry "Planification".
- Retention: `confidential-minor` (class-linked plans; no individual pupil data).
- AI: none in this slice (question drafts parked to EPIC 22 governed flow).
- Risks: no timetable module yet → plans reference stable slot keys
  (`planned_date`, `day_of_week`, minutes) until a timetable aggregate exists.
  Attachments store a file key only; virus scanning hook is not wired yet.
- Verification: cross-tenant test, RLS catalog auto-check, planner screen check,
  mock + API parity test.

### EPIC 22 — Quizzes, assignments & light LMS  `status: planned`

- Entities: `assignment`, `submission`, `rubric`, `rubric_criterion`,
  `quiz`, `quiz_question`, `question_bank_entry`, `quiz_attempt`.
- Endpoints: `/api/v1/assignments`, `/api/v1/submissions`,
  `/api/v1/quizzes`, `/api/v1/question-banks`, `/api/v1/grades/push`.
- Roles: teacher write, student submit/view own, guardian view own child.
- Screens: assignment lifecycle board, marking queue with rubric click-scoring,
  quiz runner (autosave, offline draft), results analytics.
- Retention: `confidential-minor`. Plagiarism risk is a hint only, never a score.
- AI: quiz question drafts and feedback suggestions, always reviewed; draft
  text is redacted; never auto-mark free text or rank pupils.
- Risks: automated exact-match marking must be transparent; gradebook push needs
  idempotent retry; offline draft conflict policy required.

### EPIC 23 — Behaviour, rewards & pastoral log  `status: planned`

- Entities: `behaviour_category`, `pastoral_event`, `merit`, `sanction`,
  `detention_slot`, `pastoral_note`.
- Endpoints: `/api/v1/pastoral/*`.
- Roles: teacher create, deputy/director manage categories, guardian receive
  notifications only; safeguarding records stay in the separate module.
- Screens: patterns per student/class, detention scheduler, proportionate-response
  guidance panel.
- Retention: `confidential-minor`; strict role access; audit every read.
- AI: none (forbidden to predict behaviour/risk of individuals).
- Risks: tone must stay restorative; aggregates only into early warning (EPIC 9);
  configurable categories per school.

### EPIC 24 — Special educational needs & accommodations (PAP/PPS/PAI)  `status: planned`

- Entities: `accommodation_plan`, `accommodation_adjustment`,
  `accommodation_review`, `accommodation_consent`.
- Endpoints: `/api/v1/accommodations/*` with need-to-know visibility.
- Roles: SEN coordinator + head write; teachers see adjustments only, never the
  diagnosis; guardian consent tracking.
- Screens: plan editor, review calendar with expiry reminders, export for reviews.
- Retention: `sensitive`; separate table family, field-level access, extra audit,
  shortest sensible retention.
- AI: **forbidden** to infer or suggest diagnoses.
- Risks: health-adjacent data; loud `TODO(legal/DPO review)`; HDS hosting question.
  Threat model + DPO note required before merge.

### EPIC 25 — Parent-teacher meetings & conferences  `status: planned`

- Entities: `meeting_window`, `meeting_slot_rule`, `meeting_booking`,
  `meeting_note`.
- Endpoints: `/api/v1/meetings/*`.
- Roles: teacher manage availability/notes, parent/guardian book within rules,
  reception schedule class councils.
- Screens: mobile-first booking grid, teacher day schedule, cancellation flow,
  ICS export.
- Retention: `confidential-minor`.
- AI: none.
- Risks: sibling grouping must not leak other families' data; video links must be
  provider-agnostic and not logged with personal data.

### EPIC 26 — Exams, mock exams & invigilation  `status: planned`

- Entities: `exam_session`, `exam_room`, `seating_plan`, `invigilator_assignment`,
  `exam_candidate`, `exam_mark_entry`.
- Endpoints: `/api/v1/exams/*`.
- Roles: exams officer + head; mark entry blind to identity via anonymous codes.
- Screens: room/seating planner with constraints, invigilator assignment,
  attendance sheet PDF, seating plan PDF, mark entry.
- Retention: `confidential-minor` (marks) / `special` (identity evidence).
- AI: none for marking.
- Risks: access arrangements come from EPIC 24 as requirements only; conflict
  check against timetable and rooms; printable output must not leak codes.

### EPIC 27 — Orientation, portfolio & achievements  `status: planned`

- Entities: `portfolio_entry`, `skill_framework_level`, `orientation_pathway`,
  `counsellor_note`, `achievement`.
- Endpoints: `/api/v1/portfolios/*`, `/api/v1/skills/*`, `/api/v1/orientation/*`.
- Roles: student owns portfolio, teacher/counsellor contribute, guardian view
  with consent.
- Screens: positive portfolio timeline, skills tracker, printable/shareable PDF.
- Retention: `confidential-minor`; sharing requires student/guardian consent.
- AI: caption/reflection suggestions only, reviewed, redacted.
- Risks: portfolio export must not include restricted notes or diagnoses.

---

## Track B — Staff & operations

### EPIC 28 — Staff management & absence cover  `status: planned`

- Entities: `staff_profile`, `qualification`, `leave_request`, `absence_declaration`,
  `cover_assignment`, `duty_rota`, `staff_document`.
- Endpoints: `/api/v1/staff/*`, `/api/v1/leave/*`, `/api/v1/cover/*`.
- Roles: HR + head manage contracts; teachers see directory/workload only.
- Screens: staff directory, leave approvals, cover suggestions, duty rota,
  document expiry reminders.
- Retention: `confidential-minor`-equivalent for staff (employee data): contract
  data restricted to HR, 5 years after departure.
- AI: cover suggestions from constraints only; **no performance scoring**.
- Risks: qualifications/expiry data must be accurate; cover suggestions must not
  reveal health details.

### EPIC 29 — Health office & incident log  `status: planned`

- Entities: `infirmary_visit`, `medication_authorisation`, `emergency_contact`,
  `incident_report`, `medical_alert`.
- Endpoints: `/api/v1/health/*`.
- Roles: nurse + head only; minimal alert flags surfaced to staff.
- Screens: visit log, medication authorisations, quick emergency view, accident
  report with follow-up.
- Retention: `sensitive`; separate RLS-protected tables; audit every read;
  shortest retention + erasure handling.
- AI: forbidden.
- Risks: highest sensitivity; never free-text medical history in lists/search/
  notifications. Threat model + DPO note required before merge.

### EPIC 30 — Helpdesk, facilities & maintenance  `status: planned`

- Entities: `ticket`, `ticket_comment`, `asset`, `room_booking`, `maintenance_schedule`.
- Endpoints: `/api/v1/tickets/*`, `/api/v1/assets/*`.
- Roles: staff create, IT/maintenance assign, director overview.
- Screens: Kanban + table, SLA badges (colour + icon), recurring schedules,
  request forms.
- Retention: `internal`.
- AI: triage suggestions allowed (aggregate), reviewed.
- Risks: email-in adapter must not bypass tenant binding; attachments scanned.

### EPIC 31 — Document vault & e-signature  `status: planned`

- Entities: `vault_document`, `document_template`, `signature_request`,
  `signature_evidence`, `signature_campaign`.
- Endpoints: `/api/v1/vault/*`, `/api/v1/signatures/*`.
- Roles: admin send, guardians sign own child's docs, compliance read evidence.
- Screens: vault, template merge fields, send/remind flows, tamper-evident
  signed PDF + audit certificate.
- Retention: `special` (legal documents), versioning.
- AI: document understanding only on non-restricted documents, redacted.
- Risks: flag simple vs advanced e-signature validity level; identity verification
  step; IP/device evidence minimisation. Legal review required.

### EPIC 32 — Visitor, pickup & site security  `status: planned`

- Entities: `visitor_registration`, `pickup_authorisation`, `pickup_event`,
  `rollcall_snapshot`, `site_checklist`.
- Endpoints: `/api/v1/security/*`.
- Roles: reception sign-in/out, guardian pickup, head emergency roll-call.
- Screens: badge PDF/QR, authorised-pickup list with photo + ID check, pickup log,
  late-pickup alerts, one-screen offline-capable roll call, lockdown checklist +
  mass notification.
- Retention: `sensitive` (visitor images/IDs), `confidential-minor` for pickup
  lists; short retention for visitor photos.
- AI: none for identification (facial recognition forbidden).
- Risks: safety-critical; heavy testing and explicit failure states required;
  mass notification must reuse the Epic 2 priority path with tested rate limits.

### EPIC 33 — Alumni & fundraising (plan-gated)  `status: planned`

- Entities: `alumni_profile`, `alumni_consent`, `alumni_event`, `donation_campaign`,
  `donation`, `donation_receipt`.
- Endpoints: `/api/v1/alumni/*`, `/api/v1/donations/*`.
- Roles: advancement office; alumni self-service preferences.
- Screens: opt-in directory, campaigns, receipts, preference centre.
- Retention: `confidential-minor` (former pupils); explicit opt-in, easy
  unsubscribe/erasure.
- AI: newsletter drafting allowed with review.
- Risks: payments reuse EPIC 6 rules (school merchant of record); RGPD-first
  consent and erasure; optional module behind plan gate.

---

## Track C — Community & growth

### EPIC 34 — Surveys, feedback & satisfaction  `status: planned`

- Entities: `survey`, `survey_question`, `survey_response`, `survey_theme_summary`.
- Endpoints: `/api/v1/surveys/*`.
- Roles: admin build/send, respondents anonymous or identified.
- Screens: builder, scheduling/reminders, dashboards, year-over-year comparison,
  export.
- Retention: `internal`; anonymity protected by minimum group size.
- AI: theme summaries over aggregate redacted responses only.
- Risks: re-identification via small groups; anonymous mode must not store IDs.

### EPIC 35 — Events, calendar hub & volunteering  `status: planned`

- Entities: `calendar_event`, `event_rsvp`, `event_ticket`, `volunteer_sheet`,
  `resource_booking`.
- Endpoints: `/api/v1/events/*`, `/api/v1/calendar/*`.
- Roles: comms publish, staff RSVP, guardian book, volunteers sign up.
- Screens: layered unified calendar, per-role filters, ticketing, volunteer
  sheets, personal "My calendar" with ICS/Google/Microsoft sync.
- Retention: `internal` / `confidential-minor` for RSVPs.
- AI: none.
- Risks: paid events reuse EPIC 6; sync must not duplicate leases.

### EPIC 36 — Global search, smart inbox & personal assistant  `status: planned`

- Entities: `search_document` (permission-filtered query time), `inbox_digest`,
  `assistant_action`.
- Endpoints: `/api/v1/search`, `/api/v1/inbox/today`.
- Roles: per-user permission filtering at query time.
- Screens: accent/typo-tolerant search with recent/pinned, role-based Today home.
- Retention: `internal`; no index-then-filter leaks.
- AI: next-action suggestions labelled + dismissible; voice dictation only with
  consent and redaction.
- Risks: search must never leak restricted content; assistant actions require
  explicit confirmation.

---

## Track D — Production hardening & launch

> Gate: epics 37–41 must be complete before any real school data enters an
> environment. Recorded in `docs/PILOT_READINESS.md`.

### EPIC 37 — Infrastructure as code & environments  `status: planned`

- Terraform modules: network, managed Postgres with backups/PITR, object storage,
  container runtime, secrets manager, CDN, DNS/TLS; dev/staging/prod; compose
  stays local.
- Keycloak production config: realm export hygiene, password policy, MFA,
  brute-force protection, SMTP.
- Docs: costs + EU region choice in `docs/DECISIONS.md`.
- Risks: region choice affects RGPD/HDS; secrets must never reach git.

### EPIC 38 — CI/CD & quality gates  `status: planned`

- Pipeline: lint, typecheck, unit, integration (Testcontainers), RLS catalog
  check, migration dry-run, OpenAPI diff (breaking changes), frontend build +
  bundle budget, Playwright smoke, axe accessibility, dependency/container
  vulnerability scans, secret scanning, SBOM, preview deployments, one-click
  rollback, semver + changelog, `docs/RELEASE.md`.
- Risks: budgets must fail the build, not warn.

### EPIC 39 — Observability, reliability & performance  `status: planned`

- Structured logs with correlation ids (no PII), RED + business metrics,
  distributed tracing, dashboards/alerts, health/readiness, SLOs, k6 load tests
  for morning roll call / report-card publication / payment deadline.
- Targets: p95 < 300 ms core reads at 5,000 concurrent users; roll-call write
  p95 < 500 ms.
- DB index review, slow-query log, caching, rate limiting, graceful degradation.
- Risks: current stack has no metrics/tracing; targets unverified.

### EPIC 40 — Backup, disaster recovery & data lifecycle  `status: planned`

- Automated encrypted backups, scripted restore drills executed in staging with
  measured RTO/RPO, per-tenant export/restore, offboarding (export + verified
  purge), purge dry-run reports, `docs/RUNBOOK.md`.
- Risks: drills must actually run; purge must be provable.

### EPIC 41 — Security hardening & pen-test readiness  `status: planned`

- Walk `docs/SECURITY_REVIEW_CHECKLIST.md`; OWASP ASVS L2 mapping; CSP/HSTS/
  secure cookies/CSRF in BFF; SSRF/upload hardening; rate limits/lockouts;
  secrets rotation; dependency pinning; per-tenant encryption keys for most
  sensitive tables (design or implement); DAST; threat models for health, SEN,
  safeguarding, payments; disclosure policy; `docs/PENTEST_PACK.md`.
- Risks: external tester must receive an honest scope and known limitations list.

### EPIC 42 — Internationalisation & localisation expansion  `status: planned`

- Arabic (full RTL), Spanish, German, Portuguese; locale formats; per-country
  grading scales and calendars as configuration; translation workflow with
  missing-key CI check and pseudo-localisation overflow test; terminology packs.
- French remains the reference product.
- Risks: RTL layout regressions; missing keys must fail CI.

### EPIC 43 — Public API, webhooks & marketplace foundations  `status: planned`

- Versioned REST API, scoped OAuth/API keys per school, rate limits, signed
  webhooks with retry/replay UI, sandbox tenant with seeded data, developer docs
  generated from OpenAPI, integration templates, usage dashboard per key.
- Risks: tenant isolation must hold for API keys; webhook replay must be safe.

### EPIC 44 — Pilot launch kit  `status: planned`

- Finish `docs/PILOT_READINESS.md`: onboarding checklist, import rehearsal with
  the Epic 4 importer, in-app guided tours + short help articles (FR/EN),
  feedback widget, support process + status page, success metrics, go/no-go
  checklist with owner + evidence, store submission pack update
  (`docs/STORE_COMPLIANCE.md`), legal pack list for counsel (terms, privacy
  notice, DPA, sub-processors, cookie policy).
- Risks: legal pack needs counsel sign-off; pilot toggle must genuinely restrict
  features.

---

## Per-epic definition of done

Everything from the Part 3 checklist plus:

- Stabilisation gate after every 3 epics: full suite green, load smoke test,
  dependency scan clean (or exceptions documented), bundle-size and Lighthouse
  budgets met, `docs/GAP_REPORT.md` refreshed honestly.
- Sensitive modules (24, 29, 31, 32, 33): threat model + DPO-review note committed
  before merge.
- `verify/features.yaml` updated with the new feature ids and a real check that
  exercises them.
- Demo seed + demo script step, FR/EN i18n, accessibility pass.
