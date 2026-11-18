# ROLE_UI_MAP — roles, landings, navigation and access (Part 7)

**Status:** design and implementation authority for UI access mirroring. Last updated 2026-11-17.
**Scope:** frontend only. The backend/BFF remains the security authority; the UI hides, disables
with a reason and redirects **for usability only**. Never rely on a hidden nav item for security.
**Sources:** `packages/shared/src/access/*` (registry), `apps/web/src/access/*` (guards),
`apps/web/src/components/AppShell.tsx` (nav), `docs/AUTH_DESIGN.md` (server permissions).

---

## 1. Canonical roles and landing routes

The BFF emits API roles (`DIRECTOR`, `GUARDIAN`, …). `toDisplayRole()` maps them to display roles,
and `displayToCanonical()` maps those to the 17 canonical UI roles below. A user's **first**
membership role wins unless they pick a context explicitly.

| Canonical role | Display roles accepted | Landing | Style |
|---|---|---|---|
| `principal` | director | `/principal` | standard |
| `school-admin` | admin, admissions | `/admin` | standard |
| `deputy` | deputy | `/vie-scolaire` | standard |
| `teacher` | teacher, assistant, instructor, provider | `/teacher` | standard |
| `parent` | guardian, guardian2, parent | `/parent` | standard |
| `student` | student | `/student` | standard + reading-friendly option |
| `finance` | finance, accountant | `/finance` | standard |
| `hr` | hr | `/hr` | standard |
| `safeguarding-lead` | safeguarding, therapist | `/safeguarding` | confidential + step-up |
| `nurse` | nurse | `/health` | confidential + step-up |
| `it-admin` | itadmin | `/it` | standard |
| `librarian` | librarian | `/library` | standard |
| `receptionist` | reception | `/front-office` | standard |
| `auditor` | auditor | `/audit` | read-only ribbon |
| `group-admin` | group-admin | `/group` | aggregate only |
| `super-admin` | operator | `/platform` | separate shell accent + impersonation banner |
| `analyst` | analyst | `/analyst` | pseudonymous, step-up for export |

Legacy landings `/app/dashboard`, `/app/dashboard/{admin,teacher,parent,student}`, `/home`,
`/dashboard` and `/` resolve through `landingRouteFor()`; they are kept as aliases, not copies of
dashboard code.

---

## 2. Nav tree per role

Nav items come from `ROUTE_REGISTRY` (single source of truth). Only items whose `allowedRoles`
and `requiredPermissions` match the active context render. Mobile shows at most five items plus a
**More** entry that opens the full tree.

| Role | Nav groups / items |
|---|---|
| Parent | Home; Children; Attendance; Grades & Results; Homework; Timetable; Messages; Payments; Announcements; Documents & Consents; Calendar; Profile & Security |
| Student | Home; Timetable; Homework; Grades; Attendance; Messages (policy-gated); Activities; Announcements; Portfolio; Profile & Security |
| Teacher | Home; My Classes; Register; Gradebook; Homework & Assignments; Timetable; Messages; Lesson Planner; Resources; Students (own classes); Meetings; Profile & Security |
| Principal | Home; Students; Staff; Classes; Timetable; Attendance; Academics; Admissions; Finance Overview; Communication; Reports; Approvals; School Settings; Security Centre; Audit Log; Analytics |
| School admin | Home; Students; Staff; Classes; Timetable; Attendance; Academics; Admissions; Finance Overview; Communication; Reports; Approvals; School Settings; Security Centre; Analytics |
| Deputy | Home; Attendance Board; Absences to Justify; Lateness; Behaviour & Pastoral; Detentions; Timetable & Cover; Messages; Reports |
| Finance | Home; Invoices; Payments; Families; Fee Plans; Reminders; Reports; Exports; Settings |
| HR | Home; Staff Directory; Leave Requests; Absence & Cover; Documents & Checks; Duty Rota; Reports |
| Safeguarding lead | Home; Concerns; New Concern; Follow-ups; Audit of Access; Settings |
| Nurse | Home; Visits; Medication Authorisations; Alerts; Incidents; Reports |
| IT admin | Home; Users & Invitations; Sessions & Devices; MFA Coverage; Security Events; Integrations; Helpdesk; System Status |
| Librarian | Home; Catalogue; Loans; Returns; Overdues; Members; Reports |
| Receptionist | Home; Visitors; Pickups; Absence Calls; Announcements Board; Directory |
| Auditor | Home; Audit Log; Access Reports; Permission Matrix; Compliance Pack; Exports (read-only) |
| Group admin | Home; Schools; Aggregate Analytics; Users; Billing & Plans; Security |
| Super-admin | Home; Tenants; Auth Events; Feature Flags; Support Impersonation Requests; System Status; Plans |
| Analyst | Explore; Saved Reports; Dictionary; Exports |

Items whose feature depends on an unbuilt epic resolve to `/app/soon/:module`, a polished
feature-flagged module card (`SHOW_COMING_SOON`; hidden in production nav). Nothing renders as a
blank page.

---

## 3. Route → permission table

`any` means one of the listed permissions suffices; `all` means every listed permission is
required. Deny is the default: a route absent from the registry is a 404, never a silent allow.

| Route | Required | Step-up | Notes |
|---|---|---|---|
| `/login`, `/forgot-password`, `/reset-password`, `/invite`, `/session-expired` | none | no | public/auth shell |
| `/schools/select` | authenticated | no | tenant selection |
| every role landing (`/parent`, `/teacher`, …) | canonical role | no | renders the shared `RoleDashboard` configured by role |
| `/app/timetable` | authenticated | no | |
| `/app/attendance` | `students.read` | no | teacher scope narrowed to own classes |
| `/app/people/students`, `/:id` | `students.read` | no | others' records → 404, never 403 |
| `/app/people/students/new`, `/:id/edit` | `students.write` | no | |
| `/app/people/guardians`, `/app/people/staff` | `students.read` | no | |
| `/app/people/roles` | `school.settings` | no | read-only matrix |
| `/app/school/settings` | `school.settings` | no | |
| `/app/school/members`, `/app/school/invitations` | `members.manage` | no | |
| `/app/activities*` | `activities.read` / `activities.manage` / `activities.enrol` | no | |
| `/app/safeguarding*` | `safeguarding.read` / `safeguarding.write` | **yes** for detail | no content in titles/URLs/search/toasts |
| `/app/health*` | `health.read` | **yes** for detail | separate from safeguarding |
| `/app/finance*`, `/app/finance/exports` | `finance.invoice.read` / `finance.export` | **yes** for export | no academic data |
| `/app/hr/contracts` | `hr.contracts.read` | **yes** | field-level hiding |
| `/app/security`, `/app/compliance/*` | `security.read` / `compliance.read` | export: **yes** | |
| `/app/communication/announcements` | `messages.read` | no | compose needs `messages.write` |
| `/app/communication/messages` | `messages.read` | no | composer limited to child's teachers for parents |
| `/app/platform/*` | `platform.admin` | no | separate accent |
| `/app/analytics`, `/app/analytics/explore` | `analytics.read` | export: **yes** | Part 8 |
| `/app/analytics/explore` | `analytics.student` for pseudonymous rows | no | |
| `/app/settings`, `/app/account/security` | authenticated | no | |

---

## 4. Redirect and failure rules

- Unauthenticated → `/login?returnTo=<safe internal path>`. `safeReturnTo()` rejects absolute
  URLs, `//`, `/\`, `javascript:`, `data:` and backslash tricks; a return target must also exist in
  the route registry and be permitted for the user, otherwise it is dropped.
- Authenticated without an active school and one membership → auto-select; multiple →
  `/schools/select`; none → neutral "no active school" state.
- `/`, `/dashboard`, `/home` and every legacy dashboard path → `landingRouteFor(context)`.
- Forbidden → branded in-shell 403: reason, "Go to my dashboard" primary, "Request access"
  secondary (pre-filled to the school admin). Unknown route → in-shell 404. Both never flash
  protected content. Another person's record → 404 (no existence leak).
- Sensitive routes ask for step-up before render; success returns to the same URL. Validity comes
  from the session response only (`stepUpUntil`), never from client-side timing.
- Session expiry keeps the current URL and locally autosaved non-sensitive drafts, then re-auths.
- API status handling: 401 → re-auth modal; 403 → in-place forbidden; 404 → not found;
  429 → calm banner; 5xx → retry card with correlation id.
- Deep links resolve through the registry; inaccessible deep links show 403 with context, never a
  blank page. `/r/:token` is only honoured when the decoded path exists in the registry.

---

## 5. Cache hygiene

On logout, tenant switch, role-context switch and 401: clear the TanStack Query cache, reset
in-memory widget/draft state, close SSE/WebSocket subscribers, revoke object URLs and ask the
service worker to drop authenticated caches. No token, child id, health or safeguarding content is
stored in `localStorage`/`sessionStorage`; only UI preferences and dismissed-onboarding flags are.

---

## 6. Per-role feature checklist (adapted to what exists)

Legend: **wired** = real endpoint; **mock** = `VITE_USE_MOCK` adapter with `mock: true`;
**soon** = feature-flagged "Coming soon" card; **partial** = seeded local interaction only.

| Role | Home details | Specific features shipped here |
|---|---|---|
| Parent | child pills, per-child cards, fees, messages, announcements, consents | mock: absence justification, report card, homework seen, grade drill-down, message composer, translation toggle, notification prefs, second guardian, multi-school switcher (partial) |
| Student | timetable timeline, homework checklist, grades, announcements, activities | mock: submission autosave/offline indicator, quiz shell, sign-up, reading-friendly mode; own data only |
| Teacher | lessons with Take register, marking queue, homework, messages, at-risk reasons | mock: one-tap roll call, gradebook, assignment wizard, class drawer, quick message, cover notices, weekly timetable |
| Principal / admin | KPIs, trends, alerts, approvals, quick actions | mock: directory, invitations, role matrix, approvals triage, announcement composer, settings; analytics from Part 8 |
| Deputy | missing registers, absence queue, lateness, cover needs | mock: justification queue, day board, bulk contact, detentions, cover suggestions |
| Finance | collected/outstanding, ageing, payments, reminders | mock: invoices, family account, reconciliation, reminder editor, CSV export (step-up UI) |
| HR | staff KPIs, leave, expiring checks, rota | mock: leave queue, staff profile, rota; contracts step-up (soon) |
| Safeguarding | counts/tasks only, persistent Confidential banner | mock: concern wizard/workflow, audit of access; details step-up; no leaked content |
| Nurse | visits, authorisations, minimal alert badges | mock: 2-tap visit log, medication expiry, step-up detail |
| IT admin | security KPIs, events, MFA coverage | mock: events table, unlock flow, revoke session, helpdesk Kanban |
| Librarian | loans, returns, overdues | mock: scan checkout, reminders, catalogue search |
| Receptionist | visitors, pickups, absence calls | mock: sign-in/out, pickup lookup, emergency roll-call |
| Auditor | compliance KPIs, read-only ribbon everywhere | mock: audit log, access reports, permission matrix, pack, CSV (step-up) |
| Group admin | school health chips, aggregate KPIs | mock: school grid, distribution comparison (no ranking), school context breadcrumb |
| Super-admin | tenant KPIs, flags, status | mock: tenants, flags, impersonation request + persistent time-box banner |
| Analyst | Part 8 Explore workspace | mock: safe query builder, pivots, pseudonymous keys, CSV (step-up) |

All mocks are listed in `docs/FRONTEND_WIRING.md` §“Part 7 addendum”; backend gaps are in
`docs/GAP_REPORT.md` §“Part 7 backend gaps”.

---

## 7. Shared UX

Command palette, notification deep links, quick actions, onboarding checklist (per user,
dismissible), personalisation (widget visibility/order, density, default landing tab, saved
filters), role-aware line-art empty states, help link, skeletons and forbidden states are composed
from shared widgets configured per role. Browser storage holds preferences only, never data.
