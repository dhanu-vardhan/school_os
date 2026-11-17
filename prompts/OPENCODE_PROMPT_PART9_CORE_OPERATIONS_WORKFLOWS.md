# OPENCODE PROMPT (PART 9): Core School Operations That Actually Work End-to-End (Students, Timetable, Attendance, Leave, Marks & Grades, Announcements)

> Continuation of Parts 1-8. Parts 6-8 built the dashboards, role access and analytics UI. This part makes the **daily operations behind those dashboards real and working**: adding students, class scheduling, attendance, leave, entering marks and publishing grades, and sending announcements. This is **full-stack**. Replace mock adapters (`VITE_USE_MOCK`) with real endpoints for everything in this part, keep mock mode working as a fallback, and make every dashboard widget from Parts 7-8 read the **real data** these workflows create. Reuse Part 2 Button/colour rules, Part 5 auth/step-up, Part 6 design language, Part 7 route/permission registry, Part 8 metric dictionary and analytics aggregates. Do not weaken any security, RLS, audit or privacy rule from earlier parts.

## ROLE
You are a senior full-stack engineer and product designer. The goal is simple: **a school can run a normal day on this system**. A secretary adds a student, an admin builds the timetable, a teacher takes the register and enters marks, a parent requests an absence and reads grades, a head sends an announcement, and each of these shows up correctly on every other role's screen and in analytics. If a button exists, it must do its job, persist, validate, audit and notify.

## STEP 0: DISCOVER (no questions to me)
Read `docs/PROGRESS.md`, `docs/FEATURE_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/AUTH_DESIGN.md`, `docs/ROLE_UI_MAP.md`, `docs/ANALYTICS_DESIGN.md`, `docs/METRIC_DICTIONARY.md`, `docs/FRONTEND_WIRING.md`, `docs/GAP_REPORT.md`, `docs/SCREEN_INVENTORY.md`, the backend modules and migrations (V1+), `RlsCatalogCheckTest`, `PolicyService`, the outbox/event mechanism, `apps/web/src/demo/seed.ts`, `DemoSeedRunner`, and `packages/api-client`.
Then produce `docs/OPERATIONS_AUDIT.md`: for each of the six workflows below, a table of **Screen / Button -> Endpoint -> DB table -> Policy -> Audit event -> Notification -> Analytics feed -> Status (real / mocked / missing)**. This audit is the checklist for the whole part; update it as you go. Fix every "missing" and "mocked" item in scope. Log decisions in `docs/DECISIONS.md`.

---

## PART A: SHARED FOUNDATIONS (build first, used by all workflows)

### A1. Academic structure (prerequisite data model)
Ensure these exist with `school_id` + **RLS** (added to `RlsCatalogCheckTest` and cross-tenant tests), proper indexes, soft-delete where history matters, and optimistic locking (`version`) on editable records:
- `academic_year`, `term` (name, start/end, locked flag), `school_calendar_day` (holidays, non-school days, zone C import/override), `level`, `class_group` (level, year, name, homeroom teacher, capacity), `subject`, `room`, `period_definition` (day pattern, period number, start/end times, break flags).
- `teaching_assignment` (teacher x class x subject x term, weekly hours), `enrolment` (student x class_group x year, start/end dates, status), `student` (legal name, preferred name, DOB, student number auto-generated per school, photo ref, status: applicant, enrolled, suspended, transferred, graduated, withdrawn), `guardian`, `student_guardian` (relationship, custody/contact flags, pickup authorised, can-view-grades, can-pay), `staff`, `staff_role`.
- Central **domain-event outbox**: every state change in this part emits an event (`student.enrolled`, `register.submitted`, `absence.justified`, `leave.approved`, `assessment.published`, `announcement.sent`, ...). Notifications, analytics refresh, audit and webhooks consume events; never call them inline.

### A2. Cross-cutting rules applied to every workflow
- **Server-side validation** (Bean Validation + domain rules) mirrored by shared **zod schemas** in `packages/shared`; field-level errors returned in a uniform problem-details format with i18n keys; UI shows inline errors and focuses the first invalid field.
- **Authorisation** through `PolicyService` using the Part 7 permission strings (`students:create`, `students:update`, `timetable:manage`, `attendance:record`, `attendance:correct`, `leave:request`, `leave:approve`, `grades:enter`, `grades:publish`, `announcements:send`, ...). Teacher scope = own teaching assignments only; parent = own linked children; student = self; admin/head = school. Deny by default; allow/deny policy tests per endpoint.
- **Audit** every create/update/delete/publish/override with actor, role, tenant, before/after (no sensitive payloads), reason where required, correlation id.
- **Idempotency**: all submit-type endpoints (register submit, mark save, announcement send, bulk import) accept an `Idempotency-Key`; double-click or offline-queue replay must not duplicate.
- **Concurrency**: optimistic locking with a friendly "someone else changed this, review changes" merge dialog.
- **Offline tolerance** (register + mark entry): local draft + queued submit with visible sync state ("Saved on this device / Syncing / Synced / Needs attention"), conflict handling, no sensitive data persisted beyond the Part 2 rules, queue cleared on logout.
- **Notifications** via the existing notification module: in-app + e-mail (+ push if available), per-user preferences, quiet hours, no sensitive content in the message body (deep link only), dedup and rate-limit.
- **Analytics feed**: each workflow writes the facts that the Part 8 aggregate tables read (`daily attendance facts`, `assessment facts`, `student-term facts`), via event handlers + incremental refresh; "Data as of" updates visibly after a change.
- **UX standards**: Part 6 page template, DataTables with saved views, skeleton/empty/error/forbidden states, confirm dialogs for destructive actions with undo toast where reversible, keyboard shortcuts for high-frequency screens, FR/EN, WCAG AA, mobile layouts (360/390/768).

---

## PART B: THE SIX WORKFLOWS

### 1. ADDING STUDENTS (Admissions -> Enrolment -> Guardians -> Accounts)
**Who**: school admin, secretary/registrar (add role `registrar` if not present, with documented permissions), head (approve).
**Backend**
- Endpoints: create student (single), **bulk CSV/XLSX import** (upload -> validate -> preview with row-level errors/warnings -> confirm -> async job with progress and downloadable error report), update, change status (with reason), transfer between classes (effective date, keeps history), withdraw/graduate, merge-duplicates proposal (never auto-merge), photo upload (type/size/virus-scan hook, stored outside DB).
- Duplicate detection (name + DOB + guardian contact fuzzy match) with a warning before create.
- Guardians: add/link existing guardian by e-mail/phone (avoid duplicate guardian records), relationship + permission flags, emergency contacts, authorised pickup list.
- **Enrolment into a class** is part of the create flow (choose level/class; capacity check with override requiring reason + permission).
- **Invitations**: after creation the admin can send parent/student account invitations (send/resend/revoke, expiry, single-use token, Part 5 flow); student account only when school policy and age allow.
- Auto-generated student number, optional siblings link, required-fields configuration per school (settings), consent capture (data processing, photo, trips) with timestamps.
- Events: `student.created`, `student.enrolled`, `student.status_changed`, `guardian.linked`, `invitation.sent`.
**Frontend**
- "Add student" **multi-step wizard** (Student details -> Guardians -> Class & enrolment -> Consents -> Review & create), autosaved draft, inline validation, duplicate warning card, "Save and add another".
- Import wizard (download template, upload, mapping step, preview table, fix-in-place, confirm).
- Students directory (search, filters by level/class/status, saved views, bulk actions: move class, send invitation, export with step-up), student profile (tabs: Overview, Guardians, Enrolment history, Attendance, Marks, Documents, Notes; sensitive tabs gated), edit with audit note where required.
**Done when**: a new student created by the admin appears immediately in the class list, teacher register, gradebook, parent invitation queue, student counts on the Admin/Principal dashboard, and analytics denominators (after refresh), with an audit trail.

### 2. CLASS SCHEDULING (Timetable, Rooms, Cover)
**Who**: admin / timetable manager (add permission `timetable:manage`), vie scolaire (cover), teachers (view + availability), parents/students (own view).
**Backend**
- Tables: `timetable_version` (draft/published, effective dates), `timetable_slot` (class, subject, teacher, room, period, weekday, week pattern A/B), `teacher_availability`, `room_booking`, `cover_assignment` (original slot, date, substitute, reason, status), `calendar_event` (trips, exams, meetings).
- **Constraint engine** (server-side, tested): no double-booking of teacher, room, class or student group; room capacity vs class size; teacher max hours/day; teacher unavailability; break/lunch rules; subject weekly-hours target vs scheduled; return conflicts as structured, human-readable list (what, who, when, how to fix).
- Draft -> validate -> **publish** workflow with effective date; published versions immutable (new version for changes); publishing emits `timetable.published` and notifies affected teachers/parents/students; diff view between versions.
- **Cover/substitution**: when a teacher is absent (from approved staff leave, Workflow 4) the system **creates cover needs automatically**, suggests available substitutes (rule-based, explainable: free this period, qualified subject, workload), assignment notifies the substitute and affected class; register for that lesson routes to the substitute.
- Calendar integration: school calendar days and holidays automatically remove lessons; iCal feed per user (tokenised, revocable) optional.
**Frontend**
- Timetable builder: weekly grid (classes/teachers/rooms views), drag-and-drop with live conflict highlighting and keyboard alternative, side panel of unscheduled hours, bulk copy week, publish dialog with conflict summary, version history.
- Rooms & periods settings, teacher availability editor.
- Role-appropriate timetable views: teacher (own week/day), parent (per child via ChildSwitcher), student (own), subject colours, printable/PDF, "today" timeline on dashboards reads this data.
- Cover board for vie scolaire: open cover needs, suggestions, assign/unassign, status chips.
**Done when**: a published timetable drives the teacher "today's lessons" widget, the "Take register" shortcut per lesson, parent/student timetables, room usage, cover needs from teacher leave, and the attendance session list.

### 3. ATTENDANCE (Registers, Absences, Justifications, Corrections)
**Who**: teacher (take register), vie scolaire (oversee, justify, correct), parent (justify), admin/head (monitor), reception (on-site view).
**Backend**
- Tables: `attendance_session` (timetable slot x date, taken_by, taken_at, status: not-taken / draft / submitted / locked), `attendance_record` (student, status: present / absent / late / excused-absent / authorised-absence / left-early / medical, minutes_late, note), `absence_justification` (student, date range or sessions, reason category, free text, attachments, submitted_by, status: pending / approved / rejected / needs-info, reviewer, decision note), `attendance_correction` (before/after, reason, actor).
- Sessions generated from the **published timetable** and school calendar (no sessions on holidays); students come from active enrolments (including mid-term joiners/leavers, split groups).
- Rules: default "present", teacher can only submit their own session (or substitute for cover), **edit window** (e.g. same day, configurable) after which corrections need `attendance:correct` + reason; locked at term close; submitted registers trigger "register taken" for timeliness metrics; missing-register detection job at configurable time -> alert vie scolaire + optional teacher nudge.
- **Absence notification**: when a student is marked absent/late, notify linked guardians (configurable: immediate / after first period / end of morning), without sensitive text, with a "Justify now" deep link; respect quiet hours and preferences.
- Justification workflow: parent submits (reason, dates, photo/PDF) -> vie scolaire queue -> approve/reject/ask for info with templates -> result notifies parent and updates records (absence status becomes justified) -> attendance facts recalculated; absence-to-justification lag captured.
- Attendance history per student, chronic-absence flag feed (rule-based, thresholds from settings), lateness minutes, streaks; all metrics follow the Part 8 dictionary (excused/non-school day exclusions).
**Frontend**
- **One-tap roll-call screen** (Part 7): all present by default, tap cycles present/absent/late, long-press note, "mark all present", late minutes quick picker, sticky submit bar with count summary, confirmation if many absent, offline queue banner, undo within the window, read-only after lock with a "Request correction" action.
- Teacher home: lessons timeline with register status badges (not taken / submitted).
- Parent: attendance summary per child, absence list with "Justify" 3-tap form, status tracker of each justification.
- Vie scolaire: day board (class x period grid), missing registers with "nudge teacher", unjustified queue with keyboard triage, bulk parent contact, corrections log.
- Student: own attendance view (age-appropriate). Admin/head: school-level attendance dashboard reading real data (Part 8 charts now live).
**Done when**: a teacher submits a register -> absent students appear in vie scolaire's board, parents get a notification, the parent justifies, the reviewer approves, the status updates everywhere, and Principal/Teacher/Parent attendance analytics reflect it after refresh.

### 4. LEAVES (Student Absence Requests and Staff Leave)
**Who**: parent (planned absences), student (if allowed), staff (leave requests), HR / head / line manager (approve), vie scolaire (student leave review), reception (early pickup).
**Backend**
- **Student planned absence / early leave**: request (date/time range, reason, optional attachment) -> approver (vie scolaire or head per school setting) -> approved leaves automatically **pre-mark** attendance sessions as authorised (teacher sees "Authorised absence: planned" on the register, cannot be mistaken for unexplained); one-off early pickup with authorised-person confirmation passed to reception.
- **Staff leave**: `leave_type` (annual, sick, training, personal, parental, unpaid ... configurable, with rules: needs-document, max consecutive days, notice period), `leave_balance` (accrual rules, carry-over, per academic year), `leave_request` (dates, half-days, reason, attachment, status: draft / pending / approved / rejected / cancelled / taken), approval chain (line manager -> HR for certain types), balance check at request time and at approval, overlap and blackout-date warnings (exams, parent evenings), team coverage view ("3 of 12 teachers already off that day").
- Approved staff leave **automatically**: updates the staff calendar, creates cover needs (Workflow 2), flags affected registers/lessons, notifies the requester and substitute. Cancel/modify re-evaluates cover.
- Sick-leave quick report (same-day notice to line manager + vie scolaire), return-to-work confirmation. Medical document content is HR-only (field-level restriction, step-up to view).
- Events: `leave.requested`, `leave.approved`, `leave.rejected`, `leave.cancelled`, with audit and balance ledger entries (append-only ledger).
**Frontend**
- Staff: "Request leave" form with live balance, remaining after request, conflict warnings, status tracker, calendar view, cancel.
- Approver: queue with context (balance, team coverage, calendar overlay), approve/reject with comment templates, bulk approve for simple cases, keyboard flow.
- Parent: "Planned absence / early leave" simple form; student view of outcome.
- HR dashboard (Part 7) now uses real leave data: pending queue, who is off today, upcoming leave heatmap, balance overview.
**Done when**: approving a teacher's leave produces cover needs and notifications with no manual steps; approving a student planned absence pre-marks the register; balances are always consistent with the ledger.

### 5. MARKS ENTRY AND GRADES (Assessments -> Marks -> Gradebook -> Publish -> Reports)
**Who**: teacher (create assessments, enter marks), head of department / admin (oversight, locks), parent & student (read after publish), admin (report cards).
**Backend**
- Tables: `assessment_category` (homework, test, exam, project... with weights), `assessment` (class x subject x term, title, date, max score or scale, coefficient, category, visibility: draft / marking / published, publish_at, comment visibility), `mark` (assessment x student, score, status: scored / absent / excused / not-submitted / dispensed, comment, entered_by, entered_at, version), `grade_scale` (e.g. /20, /10, letters, competency levels; normalisation to /20), `term_grade` (computed weighted average per subject, teacher appreciation text, status draft / validated), `report_card` (student x term, generated PDF ref, validated_by).
- Validation: score within 0..max, decimal rules, absent/dispensed excluded from averages (documented in the metric dictionary), coefficient handling, rounding rules, no marks for students not enrolled in the class on that date; **only the assigned teacher (or cover/admin override with audit)** can enter marks.
- **Bulk entry**: spreadsheet-style endpoint accepting a batch with per-row validation and partial-success reporting; paste from Excel; import CSV of marks for one assessment (preview + errors); idempotent.
- **Publishing workflow**: marks are private (teacher + admin) until the teacher publishes the assessment or `publish_at` fires; publishing notifies parents/students ("New result available", no score in the message); **unpublish** allowed with audit and notification suppression rules; late edits after publish require a reason and are logged and shown as "updated".
- Term close: head locks the term -> teachers' edits blocked (admin override with reason), term averages computed server-side only (single source, tested), class and cohort statistics with suppression rules from Part 8, **report card generation** (async PDF, template with school branding, appreciation fields, attendance summary, validated by head before release to parents).
- Marks changes feed `assessment facts` and `student-term facts` so analytics (distributions, value-added, assessment difficulty) update.
- Grade appeals/queries: parent or student can ask a question on a published mark (message thread linked to the assessment), teacher responds; no editing from this flow.
**Frontend**
- Teacher: assessment creation wizard (class, subject, category, max, coefficient, date, visibility), **spreadsheet-style entry grid** (keyboard navigation, tab/enter movement, paste from Excel, inline validation, live class average/median/min/max, absent/dispensed toggles, unsaved-changes guard, autosave with offline queue), "Publish results" dialog with preview of who gets notified, class statistics panel (distribution histogram, difficulty hint, suppression-aware), comments per student.
- Gradebook overview per class (students x assessments with weighted averages and trend arrows), student mini-profile drawer, term appreciation editor, printable class sheet.
- Parent/student: grades by subject with trend, class-average band only when n >= threshold, assessment detail with teacher comment, report-card viewer/download, ask-a-question button.
- Admin/head: marks completeness board (which classes/assessments are missing marks, deadline countdown, nudge teacher), term lock controls, report-card validation queue, bulk generate and release.
**Done when**: a teacher creates a test, enters marks for a class (typing and by paste), publishes, parents see the grade and get a notification, the term average updates, admin sees completeness, the head validates and releases report cards, and the Principal analytics distributions/value-added reflect the new data.

### 6. ANNOUNCEMENTS AND COMMUNICATION (Compose -> Target -> Send -> Track)
**Who**: head, admin, vie scolaire, teachers (to own classes only), reception (board), IT (system notices), group admin (group-wide notices to school admins).
**Backend**
- Tables: `announcement` (title, body rich-text sanitised, category: general / urgent / event / academic / finance-notice, priority, status: draft / scheduled / sent / cancelled / expired, publish_at, expires_at, requires_acknowledgement, attachments, language variants FR/EN), `announcement_audience` (rules: whole school, levels, classes, subject groups, staff roles, individual students' guardians, custom list), `announcement_delivery` (per recipient: channel, status, delivered_at, read_at, acknowledged_at), templates.
- **Audience resolution server-side** at send time (snapshot of recipients with count preview before sending); permission scoping (a teacher can target only their classes' guardians/students; parents cannot send school-wide); suppress duplicates (guardian of 3 children gets one message), respect per-user notification preferences, language preference, opt-outs for non-essential categories (urgent cannot be opted out), quiet hours except urgent.
- Channels: in-app board + notification centre, e-mail, optional push; delivery via the outbox with retry, bounce handling, rate limits, and a hard recipient-count confirmation threshold (e.g. > 500 requires explicit confirm).
- Scheduling and expiry; cancel before send; **edit after send** creates a visible "updated" revision; recall/expire supported; urgent flow with a distinct confirmation step.
- Tracking: delivered/read/acknowledged counts, who has not acknowledged (visible to sender and admin only, with filters), one-click **reminder to non-acknowledgers**.
- HTML sanitisation (allow-list), attachment type/size/virus-scan hook, no PII in e-mail subjects, links via the safe redirect handler, full audit of send events.
- Two-way messaging remains in Messages module; link "Reply to teacher" from an announcement only when the sender enabled replies.
**Frontend**
- Announcement composer: rich-text editor (accessible, limited formatting), audience picker with live **recipient count and preview list** (aggregate or names for authorised roles), category/priority, schedule, require acknowledgement toggle, language tabs, attachments, preview as parent/student/staff, test-send to self, confirm-and-send dialog with summary.
- Announcements board for every role (read-state, pinned/urgent on top, filters, search, acknowledge button where required), dashboard "Announcements" widget reading real data.
- Sender view: delivery stats, acknowledgement tracker with reminder action, edit/cancel/expire actions, templates library.
**Done when**: the head composes and schedules an announcement for "Year 9 parents", the recipient count is correct, parents see it at the scheduled time with the right notifications, acknowledgement is tracked and a reminder can be sent, and a teacher is correctly blocked from targeting classes they do not teach.

---

## PART C: ROLE-WISE INTEGRATION CHECK (the connective tissue)
After the six workflows exist, verify **every dashboard from Part 7 shows real data and every action works from the right role**:
- **Admin**: add student, build/publish timetable, view completeness boards, send announcements, approve enrolments and leave, lock terms.
- **Principal**: real KPIs (attendance today, marks completeness, pending approvals), real analytics (Part 8) from live facts, announcement send, term validation and report-card release.
- **Teacher**: today's lessons from the timetable, register, assessment creation + marks entry + publish, own leave request, announcements to own classes, class list from real enrolments.
- **Vie scolaire**: day board, missing registers, justification queue, cover board, planned-absence approvals.
- **Parent**: child switcher from real links, timetable, attendance + justification, planned absence request, published grades + report cards, announcements with acknowledgement, notifications.
- **Student**: own timetable, attendance, published grades, announcements.
- **HR**: leave approvals, balances, who is off today, cover impact.
- **Reception**: planned early-leave list and pickups, absence list, announcements board.
- **Group admin / Auditor / Analyst**: aggregates only, reflecting the new data with suppression; auditor can trace each workflow's audit events.
Add a **"Day in the life" demo script** in `docs/DEMO_SCRIPT.md` that walks through one full school day across roles (registrar adds a student -> admin publishes timetable -> teacher takes register -> parent justifies -> HR approves teacher leave -> cover assigned -> teacher enters and publishes marks -> head sends announcement -> principal sees all of it in analytics).

---

## PART D: TESTING, QUALITY AND SECURITY

- **Backend**: unit tests for every rule (timetable conflicts, register windows/locks, leave balance ledger, weighted averages, publish/unpublish, audience resolution, duplicate detection); integration tests with Testcontainers per endpoint; **policy allow/deny tests per role per endpoint**; **RLS/cross-tenant tests** for every new table (extend `RlsCatalogCheckTest`); idempotency and concurrency tests; migration tests; golden fixtures for grade computations consistent with the Part 8 metric dictionary.
- **Security**: IDOR tests (teacher cannot read/enter marks for a class they do not teach, parent cannot access another child's attendance/grades/justifications, student cannot see unpublished marks, teacher cannot send announcements outside their audience), input sanitisation/XSS tests on rich text, file upload tests, rate-limit tests on bulk endpoints, audit-completeness tests (every mutation produces an audit event), no sensitive data in logs/URLs/notifications.
- **Frontend**: component tests for forms/wizards/grids, schema validation parity tests (shared zod vs backend), keyboard-only tests for register and mark grid, a11y (axe zero serious), mobile layouts 360/390/768, FR/EN completeness, +30% label length.
- **Playwright E2E (cross-role scenarios)**: (1) add student -> appears in class, register and parent invite; (2) publish timetable -> teacher/parent/student views update; (3) register submit -> parent notified -> justification -> approval -> status everywhere; (4) staff leave approve -> cover created -> substitute sees register; (5) student planned absence approved -> register pre-marked; (6) create assessment -> bulk marks -> publish -> parent sees it -> report card released; (7) announcement scheduled -> delivered -> acknowledgement tracked -> reminder; (8) offline register/marks queue replays correctly without duplicates; (9) forbidden-access cases per role.
- **Performance**: register load/submit p95 < 300 ms for a class of 35; mark grid usable with 40 students x 15 assessments without lag; bulk import of 2,000 students as an async job with progress; announcement fan-out to 5,000 recipients via the outbox without blocking the request; timetable validation < 2 s for a 60-class school; document results.
- Extend `verify/features.yaml`, `docs/TRACEABILITY.md`, `docs/SCREEN_INVENTORY.md`, `docs/FRONTEND_WIRING.md` (mark each endpoint as now real), `docs/GAP_REPORT.md`, `docs/COMPLIANCE.md` (records of minors' data, retention for attendance/marks/leave, parental consent, access logs; **flag anything needing DPO/legal review**, e.g. medical documents in leave, photo consent), `docs/OPERATIONS_AUDIT.md` (all rows must end "real").

## DEMO DATA
Extend `DemoSeedRunner` (demo profile only) with a realistic **current year** for the demo tenant: classes, enrolments, a published timetable, registers already taken for past days (with a few missing ones), pending justifications, a mix of approved/pending staff and student leave, assessments in draft/marking/published states with realistic marks, one scheduled and one acknowledged-tracking announcement, an open cover need. Keep the Part 8 three-year history intact and consistent with these records. Seed must be idempotent and never run outside the demo profile.

## BUILD ORDER (commit per phase; app stays runnable)
1. `OPERATIONS_AUDIT.md` + academic structure gaps (A1) + shared foundations (A2: validation, policy, audit, idempotency, outbox events).
2. Workflow 1: Adding students (backend, wizard, import, directory, invitations) + tests.
3. Workflow 2: Class scheduling (constraint engine, builder UI, publish, role timetable views, cover model).
4. Workflow 3: Attendance (sessions from timetable, register UI, notifications, justification flow, boards) + tests.
5. Workflow 4: Leaves (student planned absence, staff leave + ledger, approvals, cover automation) + tests.
6. Workflow 5: Marks and grades (assessments, entry grid, publish, term lock, report cards, completeness board) + tests.
7. Workflow 6: Announcements (composer, audience resolution, delivery, acknowledgement tracking) + tests.
8. Integration pass (Part C): every dashboard on real data; analytics facts feeding and "Data as of" updates; demo seed and "Day in the life" script.
9. Cross-role Playwright E2E, security/IDOR/RLS suites, performance, accessibility, mobile QA, screenshots in `docs/design/screens/operations/`.
10. Docs, honest phase report `docs/PHASE_REPORTS/core-operations.md` (real vs mocked vs missing, risks, DPO/legal flags).

## DEFINITION OF DONE
- All six workflows work end-to-end with real persistence, validation, policy checks, audit, notifications and analytics feed; no remaining mocked calls for this scope (any exception listed with reason in `GAP_REPORT.md`).
- Every screen/button in `OPERATIONS_AUDIT.md` is wired and marked real; each role completes its core tasks from its own dashboard without dead buttons.
- The "Day in the life" script runs cleanly in the demo tenant and each step is visible on the other roles' screens.
- Policy, RLS, IDOR, idempotency, concurrency, golden-fixture, E2E, performance, axe and mobile suites green; `scripts/verify-all.sh` green; no raw colours; single Button system; FR/EN complete.
- Data stays consistent: attendance, marks, leave balances and enrolment counts reconcile across dashboards, exports and analytics (add reconciliation tests).
- Docs updated and an honest report delivered.

## RULES OF ENGAGEMENT
- Server is the authority: UI hiding is a convenience only; never trust client-provided role, tenant, class or student ids without policy checks.
- Never delete history that matters (attendance, marks, leave, enrolment): use status changes, versions and append-only ledgers with audit.
- Never auto-decide about students or staff; automation only creates tasks, suggestions and notifications that a human can review.
- Keep notifications and e-mails free of grades, health details, absence reasons and other sensitive content: deep link only.
- Small components (< 300 lines), reuse `packages/ui` and shared widgets; no per-role copy-paste.
- Do not invent business rules silently: pick safe, configurable defaults (edit windows, thresholds, quiet hours, capacity overrides), expose them in School Settings, and log them in `docs/DECISIONS.md`.
- Work autonomously; if you stop, leave a "resume here" note in `docs/PROGRESS.md` with the exact phase, files and next command.

START NOW with STEP 0, then phase 1.
