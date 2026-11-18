# PART11_FINANCE_AUDIT — Finance role (PROMPT 004, P0)

**Date:** 2026-11-18  
**Scope:** Read-first audit of finance-related routes, navigation, UI, API, DB, security, tests, and demo data in `SMS_SOF` / SchoolOS. No production claims are made in this audit.  
**Status:** P0 audit (documentation). Implementation/fixes follow in P0–P8 commits per PROMPT 004.

## 1. Sources read (required)

- `AGENTS.md`
- `docs/ROLE_UI_MAP.md`
- `docs/SCREEN_INVENTORY.md`
- `docs/COMPLIANCE.md`
- `docs/SECURITY_REVIEW_CHECKLIST.md`
- `docs/AI_GOVERNANCE.md`
- `docs/DECISIONS.md`
- `docs/PRODUCTION_READINESS.md` (not present at audit time)
- `packages/shared/src/access/{routes.ts,permissions.ts,roles.ts,index.ts,landing.ts}`
- `packages/shared/src/{roles.ts,demo-seed.ts}`
- `apps/web/src/app/{nav.ts,permissions.ts,session.tsx}`
- `apps/web/src/App.tsx`
- `apps/web/src/pages/{Reports.tsx,Settings.tsx,Dashboards.tsx}`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/access/{RouteGuard.tsx,states.tsx,index.ts}`
- `services/api/src/main/java/com/schoolos/security/{PolicyService.java,...}`
- `services/api/src/main/java/com/schoolos/analytics/*` (incl. `AnalyticsFactSource.FinanceRow`, `JpaAnalyticsFactSource`, `AnalyticsPolicyService`, `AnalyticsService`)
- `services/api/src/main/resources/db/migration/V6__analytics.sql` (finance analytics fact table only)
- `services/bff/src/{server.js,identity/demo-accounts.js,identity/roles.js}`
- Tests: `RoleMatrixTest`, `ControllerPolicyCatalogTest`, `ParentScopeTest`, `CrossTenantIsolationTest`, `RlsCatalogCheckTest`, analytics tests referencing finance (`AnalyticsPart8ApiTest`, `AnalyticsPart8PolicyTest`, `AnalyticsServiceTest`)

## 2. Current finance state — summary

| Area | Status | Evidence / notes |
|---|---|---|
| Finance role identity (BFF demo) | **Exists** | `services/bff/src/identity/demo-accounts.js`: `account('finance', 'Lucie Bernard', ROLES.FINANCE, [A])` titled "Responsable financière"; `parent-2` is `Sarah Cohen` (guardian). `services/bff/src/identity/roles.js`: `FINANCE` in MFA-required/privileged sets, alias `finance`/`bursar`. |
| Finance demo user (shared/web seed) | **Exists (different persona)** | `packages/shared/src/demo-seed.ts`: finance user `Sarah Cohen` (`demo-finance`, `compta@saint-denis.edu.fr`, school A). Prompt-observed login label "Sarah Cohen — Finance" aligns with shared/demo UI data. |
| Finance landing route `/finance` | **Exists but broken (leak)** | `packages/shared/src/access/routes.ts`: role landing `/finance` allowedRoles `['finance']`; `CANONICAL_LANDINGS.finance='/finance'`. `apps/web/src/App.tsx`: `<Route path="/finance" element={<DashboardSwitch />} />`. `Dashboards.tsx`: `ROLE_FAMILY.finance === 'school'` => `DashboardSwitch` falls through to `<AdminDashboard />` (director-style dashboard). |
| `/app/finance` route | **Stub/placeholder** | `App.tsx`: `<Route path="/app/finance" element={<SoonPage />} />`. |
| Finance sidebar nav | **Partially stubbed** | `ROLE_NAV_TREES.finance` in `access/routes.ts`: Dashboard `/finance`; Invoices/Payments/Fee plans/Reminders -> `soon('finance', ...)`; Families -> `/app/people/guardians` (real, `students.read`); Reports -> `/app/reports`; Exports -> `/app/finance/exports` (registry route exists but `soon: true`, `nav: false`, `finance.export` + step-up); Settings -> `/app/settings` (label `nav.settings`). |
| Finance API domain (billing/invoicing/payments/SEPA/ledger/etc.) | **Missing** | No finance controllers/services/entities/repositories/migrations under `services/api/src/main/java` (excluding analytics). `grep` finds no finance operations package; only analytics and test/demo references. |
| Finance DB tables (operations) | **Missing** | No `V*finance*` migration. `V6__analytics.sql` defines `analytics_finance_fact` (aggregate analytics only, RLS-enabled) — **not** an operational finance ledger/invoicing schema. |
| Finance analytics (Part 8) | **Exists (aggregate/governed, limited)** | `AnalyticsFactSource.FinanceRow`, `JpaAnalyticsFactSource.finance(...)`, `AnalyticsService` metric `finance.collection_rate` (invoiced/collected cents, aggregates), `AnalyticsPolicyService` grants finance/accountant scope; analytics tests cover finance metric/policy. Backend refresh reports `sourceAvailable=false` when upstream facts absent (no fabrication). |
| Finance permissions (frontend shared) | **Partial (legacy/simple)** | `packages/shared/src/roles.ts`: finance has `students.read`, `billing.read`, `billing.manage`, `finance.invoice.read/write/export/reminders`, `reports.read`, `compliance.read`, `messages.read`, `analytics.read/export`. Accountant similar but reduced. No four-eyes, no SEPA/reconciliation/closing/budget granularity, no sensitive-read/step-up split beyond route flags. |
| Finance permissions (API) | **Partial (legacy/simple)** | `PolicyService`: `FINANCE` -> `DASHBOARD_READ, SCHOOL_READ, STUDENT_READ, BILLING_READ, BILLING_MANAGE, ACTIVITY_READ, MESSAGE_READ, EXPORT, AUDIT_READ, ANALYTICS_READ, ANALYTICS_EXPORT`; `ACCOUNTANT` similar. `EXPORT` is in sensitive set (step-up required). No finance-operations permissions. |
| BFF finance handling | **Partial** | `roles.js`: finance MFA-required/privileged; demo account exists. `server.js`/identity enforce auth/session/MFA/CSRF/rate-limit patterns (not exhaustively audited here for finance-specific endpoint policy). No finance-specific server routes found in identity files. |
| Guardian finance portal | **Not implemented** | Parent nav includes `nav.payments` as `soon('parent', 'payments')` gated by `finance.invoice.read` (parents have it in shared roles), but no finance portal pages/flows. |
| Tests covering finance | **Minimal** | `RoleMatrixTest`: `financeCanManageBillingButNotSafeguarding` (billing read/manage yes; safeguarding/health denied). Analytics tests cover `finance.collection_rate`/policy/facts. No invoice/payment/SEPA/ledger/RLS-per-finance-table/IDOR/Playwright finance flows. `ControllerPolicyCatalogTest` only checks declared policy on existing controllers (no finance controllers to catalog yet). |

## 3. Defects observed (PROMPT 004 §1) — audit findings

| # | Defect | Status | Evidence | Impact |
|---|---|---|---|---|
| D-F1 | Finance landing `/finance` is a copy of director dashboard (cross-domain leak) | **Confirmed** | `/finance` route -> `DashboardSwitch` -> `AdminDashboard` for `ROLE_FAMILY.finance='school'`. `AdminDashboard` shows enrolment/attendance rate+trend, `openConcerns` (safeguarding count, `dash.safeguardingCountHint`), AI suggestions pending, headcount-by-level chart, holidays, "latest activities"/audit feed from notifications, and quick actions incl. `students.new` (New student) and `dash.newAnnouncement` (New announcement) + timetable/presences links. `TopTasks` also exposes attendance/messages/reports/students shortcuts based on generic permissions. | Finance sees safeguarding counts, attendance metrics, school activity feed/messages context, pupil creation and announcement actions — **must be removed and replaced with real F1 finance dashboard**. |
| D-F2 | Finance can/cannot reach restricted routes by URL and direct API (needs verification & enforcement) | **Partially mitigated by UI route registry, unverified end-to-end** | `RouteGuard` (AppShell Outlet) uses `findRoute`/`routeAccess` from `packages/shared/src/access/routes.ts`. Role landings have `allowedRoles` (`/principal` principal-only, `/safeguarding` safeguarding-lead-only, `/teacher` teacher-only). `/app/safeguarding` requires `safeguarding.read`; `/app/security` requires `security.read`; finance lacks these in shared/API matrices. Finance nav exposes `/app/reports` and `/app/people/guardians` (`students.read`) and `/app/settings` but not safeguarding/security/audit-log links. **Not yet proven:** Playwright + direct API calls with finance token for `/principal,/teacher,/assistant,/safeguarding,/security,audit log` and all finance-scoped endpoints. `/app/compliance/audit` is `security.audit.read`-gated in registry for auditor context but route-level permission must be confirmed; `/audit` landing is auditor-only. | UI hiding insufficient; must test and enforce server-side (BFF/API/RLS) for every finance-reachable and restricted path/API. |
| D-F3 | `nav.settings` raw i18n key shown (global) | **Confirmed** | Finance nav includes `['nav.settings','/app/settings','Settings2']` (`access/routes.ts`); other roles use `nav.settings` too (safeguarding-lead etc.). `grep` shows no `"nav.settings"` key in `packages/i18n/src/locales/{fr,en}.ts` (only aliases/other keys like `nav.schoolSettings`/`nav.audit` were added in prior work per checkpoint). | Untranslated key rendered in DOM; requires global fix + test failing on any untranslated `nav.*`/`*.nav.*` key in rendered DOM for every role. |
| D-F4 | Activity/feed strings stored/localized incorrectly (Chrome-translate confusion noted) | **Likely/partially present** | `packages/shared/src/demo-seed.ts` notifications include French titles/bodies (e.g. "Appel enregistré", "Nouveau message", "Liste d’attente activité", "Facture en retard") — checkpoint states #2 localized shared demo notifications to FR, but feed rendering/components and any English-stored titles must be audited in app i18n context (not browser translate). Some i18n strings remain EN in source patterns in other areas; need role-wide rendered-content check. | Feed may show non-locale strings; must localize via app i18n templates and test FR/EN locales. |
| D-F5 | KPI "Open reports 2" / "Number only — no details" on finance screen is cross-domain leak | **Confirmed on current finance landing** | `AdminDashboard` renders open concerns count card with `t('dash.safeguardingCountHint')` ("Number only — no details" / "Nombre uniquement — aucun détail") as hint — even as count-only this discloses safeguarding domain state to finance. Finance landing currently shows this via director dashboard. | Must remove entirely from finance context (and ensure finance APIs do not return it). |

## 4. Routes, nav, UI pages (finance-relevant)

| Route / nav item | Type | Current behavior | Access control (observed) | Assessment |
|---|---|---|---|---|
| `/finance` | Role landing | Renders `DashboardSwitch` -> `AdminDashboard` (leak) | `allowedRoles:['finance']` in registry; RouteGuard active in shell | **Broken** (wrong content + leaks) |
| `/app/finance` | App route | `SoonPage` placeholder | No explicit finance-only guard shown; inside authed shell | **Stub** |
| `/app/soon/finance/invoices` | Soon | Coming soon | `soon()` path, shown in finance nav | **Stub** |
| `/app/soon/finance/payments` | Soon | Coming soon | `soon()` path | **Stub** |
| `/app/people/guardians` (nav "Familles") | Real page | Guardians/people page (general) | Nav requires `students.read`; finance has `students.read` in shared/API. Route/page permission model must ensure no overexposure of non-finance data/actions. | **Exists but not finance-domain-specific** (needs finance payer/family ledger view per F2) |
| `/app/soon/finance/plans` | Soon | Coming soon | nav item, no permission listed | **Stub** |
| `/app/soon/finance/reminders` | Soon | Coming soon | `finance.reminders` | **Stub** |
| `/app/reports` (finance nav) | Real page | Generic reports form/page (`ReportsPage`) gated by `reports.read` | Finance has `reports.read` | **Exists but generic; not F11 finance reports** |
| `/app/finance/exports` | Registry route | `soon: true` in registry (no dedicated page route in App.tsx besides soon pattern?) | `finance.export`, `requiresStepUp: true`, `nav:false` | **Stub/flagged** |
| `/app/settings` (finance nav "nav.settings") | Real page | User/app settings page | No finance-specific restriction; rendered in shell | **Exists (generic)** but label broken by missing i18n key |
| `/app/hr/contracts` in finance? | No | N/A | HR-only in nav/permissions | N/A |
| `/principal`, `/teacher`, `/safeguarding`, `/app/safeguarding`, `/app/security`, `/app/compliance/audit`, `/audit` | Various | Role dashboards or protected pages | Registry/guards/permissions appear restrictive (`allowedRoles`, `safeguarding.read`, `security.read`, `security.audit.read` as applicable) | **Likely denied to finance, but must be verified by Playwright + direct API with finance token** |

**Missing routes/pages required by PROMPT 004:** families/payer accounts, invoicing, encaissements, SEPA mandates/batches/returns, bank reconciliation, dunning, refunds/avoirs, tarifs/plans, budget, suppliers/purchases (phase 2), finance reports/analytics, exports comptables, closings, finance settings, finance audit journal, guardian finance portal, etc.

## 5. API, controllers, services, data model

| Component | Status | Evidence / notes |
|---|---|---|
| Finance operations controllers/services | **Missing** | No `finance`/`billing`/`invoice`/`payment`/`sepa` domain implementation in `services/api/src/main/java/com/schoolos` (excluding analytics). |
| Analytics finance facts | **Exists** | `AnalyticsFactSource$FinanceRow`, `JpaAnalyticsFactSource` queries `analytics_finance_fact`, `V6__analytics.sql` creates aggregate fact table with RLS/forced RLS policies. |
| Operational finance schema (ledger, invoices, mandates, etc.) | **Missing** | No Flyway migration for PROMPT 004 tables (`payer_account`, `invoice`, `payment`, `sepa_mandate`, `journal_entry`, etc.). `V10__finance.sql` to be added in later phase as required. |
| Authorization model | **Legacy/basic** | `PolicyService` has coarse permissions (`BILLING_READ/MANAGE`, `EXPORT`, `AUDIT_READ`); `FINANCE` can export/audit-read/manage billing but cannot do safeguarding/health. Sensitive permissions require step-up. No four-eyes/preparer!=approver, no threshold routing, no finance-specific capabilities matrix, no acting-under-delegation flagging. |
| Tenant isolation / RLS enforcement patterns | **Exists for current tenant tables** | `TenantContext`, tenant-aware datasource, `CrossTenantIsolationTest`, `RlsCatalogCheckTest` (asserts forced RLS on all tables with `school_id`). Finance tables added later must comply. |
| Parent scope / IDOR tests | **Exists (students/guardian-child)** | `ParentScopeTest` covers guardian/student row scope on people domain; no finance entity IDOR tests yet (required). |
| Demo seed (API) | **Minimal finance identity** | `DemoSeedRunner` includes `new Member("demo-finance", "FINANCE")`; no finance operational seed data. |

## 6. BFF / session / security

| Component | Status | Evidence / notes |
|---|---|---|
| Finance demo identity & MFA | **Exists** | BFF demo accounts include finance (`Lucie Bernard`, FINANCE) and marks finance as MFA-required/privileged. Shared demo users include `Sarah Cohen` as finance in web demo seed. Need to align/verify login UX naming as observed. |
| Session/CSRF/proxy/rate-limit | **Exists (general)** | `server.js` includes CSRF/origin checks, cookie session handling, rate limiting, proxy patterns, static serving, security headers (from inspected portions). Finance-specific permission claims/endpoint authorization parity with API must be verified/extended. |
| Direct API access control for finance token | **Not verified** | Prompt requires Playwright and direct API calls proving finance cannot reach `/principal,/teacher,/assistant,/safeguarding,/security,audit log` (and restricted APIs). Current tests do not cover this matrix. |
| Step-up / sensitive actions | **Partial** | API `EXPORT` sensitive (step-up). BFF/session has step-up state handling (`StepUpGate`, `stepUpActive`, `markStepUp` in session code). Finance-specific step-up actions (IBAN/SEPA export/refunds/write-offs/exports/reveal/approvals) not implemented. |

## 7. Mocks, api-client, demo data

| Component | Status | Evidence / notes |
|---|---|---|
| `packages/api-client` finance operations | **Missing** | No typed finance operations queries/mutations observed in audit scope (generic dashboard/students/reports/notifications etc. exist). Mock/real contract parity required for new finance domain. |
| Mock/adapter/db finance state | **Missing for operations** | Stateful mock supports existing domains; no finance ledger/invoice/payment/SEPA state. |
| Demo seed (shared) | **Insufficient for PROMPT 004** | Has invoices/guardians/notifications and finance user, but not the required 40-family scenario (separated parents/split billing, 3 QF tiers, 6 active + 1 lapsing + 1 revoked mandates, 12 invoices varied, 4 unmatched bank lines, 1 rejected debit, 3 overdue at different dunning levels, 2 pending approvals, 1 refund over threshold, 1 expired delegation) with obviously fictional names/IBANs. |

## 8. i18n, formatting, feed/content

| Component | Status | Evidence / notes |
|---|---|---|
| `nav.settings` translation | **Broken/missing** | Key absent in `packages/i18n/src/locales/fr.ts` and `en.ts`; rendered in finance and other role navs. Global fix + DOM test for every role required. |
| Finance-specific FR/EN strings | **Missing** | No finance module terminology/screens (F1–F17). |
| Date/time/money locale | **Partial/generic** | App has locale-aware formatting utilities; finance must enforce FR primary/EN secondary, `dd/MM/yyyy`, 24h, `Europe/Paris`, `EUR 1 234,56 €`, integer cents end-to-end. |
| Activity feed localization | **Needs verification/fix** | Shared notifications appear French in seed; must ensure app i18n templates drive rendered feed (not stored English leaking, not browser-translate dependent). |

## 9. Verification / docs gaps

- `docs/PRODUCTION_READINESS.md` absent (must be created/appended per PROMPT 004 with honest gate).
- No `docs/FINANCE_POLICY_FR.md`.
- `docs/{ROLE_RESPONSIBILITIES_FR,ROLE_UI_MAP,SCREEN_INVENTORY,METRIC_DICTIONARY,TRACEABILITY,DEMO_SCRIPT}.md` not yet updated for finance F1–F17.
- `verify/features.yaml` has no finance operations features.
- `scripts/verify-all.sh` not run for finance; Playwright finance flows absent.
- Required evidence not yet produced for PROMPT 004 phases (commits/tests/runs/screenshots).

## 10. P0–P8 plan (PROMPT 004, execution order)

| Phase | Scope (one commit each) | Key deliverables |
|---|---|---|
| **P0** | Audit + defect fixes | This audit, `docs/DECISIONS.md` scope/policy decisions, replace finance dashboard leak with safe/real F1 shell (no cross-domain data), route/API access verification & enforcement for finance vs restricted areas, fix `nav.settings` globally + untranslated-key DOM test for every role, localize feed via app i18n, remove cross-domain "Open reports" count leak. |
| **P1** | Permissions, four-eyes, delegation, audit chain, ledger core + Money | Shared permission model + BFF + API `@RequirePermission`, finance profiles (operator/manager/external accountant read-only), four-eyes/preparer!=approver server-side, threshold/delegation reuse, hash-chained/tamper-evident finance audit + sensitive-read audit, Money (integer cents+currency) + double-entry append-only ledger primitives, step-up/MFA hooks. |
| **P2** | Families, plans, invoicing, payments, receipts | Payer accounts/split billing, fee plans/versions/sectors, batch/individual invoicing (gap-free, immutable, credit-note corrections), payments/allocations/receipts, `PaymentProvider` port + deterministic fake, webhooks idempotent/signed. |
| **P3** | SEPA mandates/batches/returns + pre-notification jobs | Mandate lifecycle/RUM/ICS mentions, pre-notification scheduler (default 14d, configurable), batch build/approve/export (pain.008 XSD-validated in tests), R-transactions, lapse/revocation/contestation windows, `SepaFileGenerator` port. |
| **P4** | Bank import/reconciliation, dunning, refunds/credit notes | CAMT.053/CSV/OFX import + matching, period-aware reconciliation, dunning ladder/templates/log with no automated pupil-affecting action, refunds/contestation/write-offs/credit notes with approvals/thresholds. |
| **P5** | Reports, budget, exports (FEC/CSV), closings | F1/F11 metrics (aged receivables, DSO, sector reports, suppression), budget vs actual, FEC/CSV/e-reporting hooks + mapping, closings/period locks (DB-enforced), audited/watermarked/step-up exports. |
| **P6** | Guardian portal finance | Payer ledger/invoices/mandates/payments/receipts/attestations, contest, règlement acceptance, FR/EN mobile accessible, no sensitive subjects in notifications. |
| **P7** | Optional (flagged) payables + e-invoice receiving stub | Suppliers/POs/three-way match/SEPA credit transfer pain.001, `EInvoiceReceiver` port + stub/documented PDP integration point (reception obligation noted; human/vendor decisions). |
| **P8** | Tests, verify, production gate docs | Unit/property/integration/JUnit/Playwright, RLS/IDOR/cross-tenant/four-eyes/webhook/log-scrubbing, `verify/features.yaml`, `scripts/verify-all.sh`, `docs/PRODUCTION_READINESS.md` honest gate, final F1–F17 status table and blockers. |

## 11. Risks / blockers identified now

- **Legal/regulatory authority:** thresholds/calendars (SEPA, e-invoicing/e-reporting, VAT/tax treatment, retention, cash ceilings, attestation wording, OGEC sector rules) must be implemented as configurable policy with `// verify with expert-comptable / current legislation` and marked "needs human" where required. No claim of legal correctness.
- **Security-critical domain:** family bank data/IBAN/mandates/income docs require MFA/step-up, encryption-at-rest for sensitive fields, masking, audited reveals, log scrubbing, and strict tenant/guardian isolation. Existing security tests must not be weakened.
- **Large scope:** F1–F17 + production gate spans schema, ports/adapters, jobs, UI, api-client/mock parity, and extensive tests; must be phased with commits and honest partial statuses.
- **Identity/demo mismatch:** finance displayed as "Sarah Cohen — Finance" in prompt observation but BFF demo finance account is `Lucie Bernard` (key `finance`) while shared demo seed uses `Sarah Cohen` as finance user — must be reconciled carefully during P0/P8 seed/demo work without breaking existing flows.

## 12. Immediate next actions (P0 implementation)

1. Record PROMPT 004 scope/legal-policy decisions in `docs/DECISIONS.md` (and create `docs/FINANCE_POLICY_FR.md` skeleton with "verify" flags).
2. Fix finance dashboard leak: replace director `AdminDashboard` for finance with a finance-safe landing/F1 placeholder showing only finance-relevant data (no safeguarding/attendance/pupil creation/announcements/cross-domain counts/feed leaks).
3. Verify and enforce route/API access for finance (UI guards/registry + BFF/API) against `/principal,/teacher,/assistant,/safeguarding,/security,audit log` and restricted APIs; add evidence/tests.
4. Fix `nav.settings` translation globally and add rendered-DOM untranslated-key test for every role.
5. Localize activity feed via app i18n (FR/EN), independent of browser translate.
6. Commit P0 audit + defect fixes.
