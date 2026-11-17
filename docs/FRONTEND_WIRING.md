# FRONTEND_WIRING (Step 0 audit, 2026-11-16)

Scope: `apps/web` (only frontend app), `packages/api-client` (empty), `packages/ui` (empty), `packages/platform` (stubs), `packages/i18n` (empty). Backend: Spring Boot API with 2 controllers (`/api/v1/schools`, `/api/v1/students`, JWT-protected), no BFF, no OpenAPI spec file, no `/session|/config|/me/permissions`.

## Counts
| Status | Count |
|---|---:|
| wired | 0 |
| partial | 0 |
| hard-coded | 9 |
| mocked | 7 |
| dead | 14 |
| broken | 0 |
| stubbed (info placeholder) | 18 |
| **Total rows** | **48** |

Notes: "mocked" = stateful in-browser demo engine/localStorage (not real backend); "stubbed" = `InfoScreen`/placeholder text; "dead" = controls with no real backend effect beyond local/demo state or missing required real-stack behavior. No `wired` rows (no screen meets all 8 wiring criteria).

## Screen/control wiring

| Screen / control | Role(s) | Data source (endpoint, operationId) | Auth/permission source | Loading / empty / error / offline / denied states | Status |
|---|---|---|---|---|---|
| Demo landing / role picker | all | `apps/web/src/demo/seed.ts` (local) | none (demo) | loading/ready boot only; no real denied | mocked |
| Global shell/nav/banner/reset | all | local state/localStorage `schoolos_demo_state_v1` | none | no real auth/offline-sync/error boundaries for API | mocked |
| Director Home / KPIs / announce | director,deputy | local `DemoState` | none | none for backend; empty not modeled | hard-coded |
| Director Classes (list/search/select/create/passage) | director,teacher(readOnly) | local `DemoState.classes` seed | none | empty via filter in cards? limited; no API states | hard-coded |
| Teacher Home | teacher,assistant | local `DemoState` | none | none | hard-coded |
| Teacher Présences (mark present/absent/retard, offline toggle label) | teacher,assistant | local `DemoState.children/classes` | none | fake "en attente/synchronisé" text, no real queue/sync | hard-coded |
| Teacher Messages (send/list) | teacher,assistant | local `DemoState.messages` | none | none | hard-coded |
| Teacher Observations (add/list) | teacher,assistant | local `DemoState.observations` | none | none | hard-coded |
| Guardian Home / child switcher view | guardian,guardian2 | local `DemoState.children` | none | no real child switch/multi-school context | hard-coded |
| Guardian Messages (reply) | guardian,guardian2 | local `DemoState.messages` | none | none | hard-coded |
| Guardian Absence (declare) | guardian,guardian2 | local `DemoState.children` | none | none | hard-coded |
| Guardian Paiements (sandbox pay) | guardian,guardian2 | local `DemoState.invoices/inbox` | none (not real sandbox/webhook) | no webhook-final, no double-submit guard to backend | hard-coded |
| Guardian Activités (book/waitlist) | guardian,guardian2 | local `DemoState.activities` | none | no conflict/waitlist-offer expiry real flow | hard-coded |
| Guardian QR retrait | guardian,guardian2 | static local render | none | none | hard-coded |
| Teacher Classes view | teacher,assistant | local classes (readOnly) | none | limited | mocked |
| Guardian Calendrier | guardian,guardian2 | none | none | placeholder | stubbed |
| Director/dep Personnes | director,deputy | none | none | placeholder | stubbed |
| Director/dep Facturation | director,deputy | none | none | placeholder | stubbed |
| Director/dep Activités mgmt | director,deputy | none | none | placeholder | stubbed |
| Director/dep Réglages | director,deputy | none | none | placeholder | stubbed |
| Teacher Rapports | teacher,assistant | none | none | placeholder | stubbed |
| Reception Accueil/Kiosque/Visiteurs | reception | none | none | placeholder | stubbed |
| Finance Accueil/Facturation/Rapprochement | finance | none | none | placeholder | stubbed |
| Admissions Accueil/Pipeline/Campagne | admissions | none | none | placeholder | stubbed |
| Instructor/Provider Accueil/Sessions/Présences/Règlements | instructor,provider | none | none | placeholder | stubbed |
| Safeguarding Accueil/Signalements | safeguarding | none | none | placeholder | stubbed |
| Operator Accueil/Établissements/Métriques | operator | none | none | placeholder | stubbed |
| API client package (`packages/api-client`) | n/a | none (empty dir) | n/a | n/a | dead |
| Generated client/hooks/validators | n/a | no OpenAPI spec found | n/a | n/a | dead |
| HTTP layer (BFF cookie, CSRF, correlation, idempotency, retry, timeout) | n/a | none | n/a | n/a | dead |
| Session bootstrap `/session` + `/config` + `/me/permissions` | n/a | endpoints missing | Keycloak/BFF missing | boot error screen exists but not wired to config/session | dead |
| Auth flow (BFF redirect/PKCE, logout, school switch, 401/403 handling) | n/a | BFF missing | missing | 401 re-auth/neutral 403/maintenance/upgrade missing | dead |
| Data layer (TanStack Query, scoped keys, invalidation, SSE) | n/a | unused dependency only | n/a | optimistic/rollback for real writes missing | dead |
| Forms/schemas/unsaved-guard/double-submit | n/a | none | n/a | n/a | dead |
| i18n package/keys FR+EN | n/a | `packages/i18n` empty; strings hard-coded in components | n/a | n/a | dead |
| UI package/design-system components as shared lib | n/a | `packages/ui` empty; styles in app CSS | n/a | n/a | dead |
| Real backend: students | all permitted | `GET/POST /api/v1/students`, `GET /api/v1/students/{id}` exist but UI never calls | JWT Bearer required (401 from browser) | no UI states wired | dead |
| Real backend: schools | system/admin | `GET/POST /api/v1/schools`, `GET /api/v1/schools/{id}` exist but UI never calls | JWT required | no UI | dead |
| Notifications/Files/Payments/AI/Jobs/SSE endpoints | n/a | missing | n/a | n/a | dead |
| Playwright real-stack/read-back tests for screens | n/a | none | n/a | n/a | dead |
| Bundle guards / prod exclusion of demo-mock-role-switcher | n/a | not implemented (demo engine always in app build) | n/a | n/a | dead |

## Automated checks (observed)
- `cd apps/web && pnpm typecheck`: PASS (tsc --noEmit). `pnpm lint`/`pnpm test`: scripts missing (fail "Command not found").
- HTTP crawl (dev server): `/` 200, `/src/main.tsx` 200, `/src/index.css` 200, `/api/students` 401 (expected, protected). No OpenAPI/swagger file found. Backend controllers: 2 only.
- Scan: no handwritten `fetch/axios` in `apps/web/src` or `packages`; extensive hard-coded/demo data and `localStorage`/`setTimeout` in `apps/web/src/App.tsx` + `demo/seed.ts`; `packages/*` mostly empty/stub.

## Ranked blockers (by screens/controls blocked)
1. **No BFF + auth/session/config/permissions flow** (Keycloak login, `/session`, `/config`, `/me/permissions`, cookies/CSRF, 401/403/upgrade/maintenance) — blocks all real-stack wiring and role/permission correctness.
2. **No generated `packages/api-client` + no OpenAPI contract** (and only 2 backend endpoints exist) — blocks typed data access, runtime validation, contract tests, and most screens' data sources.
3. **No HTTP/data layer and monolithic demo-only UI** (no Query client, no scoped cache, no mutations/invalidation/SSE, no real forms/error model; `App.tsx` uses local state/localStorage) — blocks wiring any screen to backend with correct states/effects.
4. **Missing backend modules/endpoints/fields/events** for nearly all inventory features (attendance, messaging, billing/payments webhooks, activities, files, notifications, AI, operator, etc.) — blocks per-screen real data/actions; requires `docs/BACKEND_GAPS.md` + minimal backend work per prompt.
5. **Missing quality infrastructure** (i18n/ui packages, lint rules against raw fetch/hard-coded strings, tests/Playwright/axe/bundle guards, offline store, SSE client) — blocks marking screens `wired`/G16 green.

## Stop/report
- **Works now:** demo web renders styled (200) with in-browser fictional data/role switcher; API health up; `/api` correctly 401. Typecheck passes.
- **Status:** 0 wired, 0 partial, 9 hard-coded, 7 mocked, 14 dead, 18 stubbed, 0 broken (48 rows). No real backend wiring in frontend.
- **Next:** per Prompt 12, build foundation (api-client generation, HTTP/error/data layers, session/config bootstrap, guards, bundle guards) and address backend gaps starting with highest-value screens — after OpenAPI/BFF/auth are available or minimally added.

## Part 8 analytics wiring addendum (2026-11-17)

The Step 0 table above still describes the legacy demo shell. The governed analytics layer adds
typed contracts; it does **not** turn the legacy screens into real-stack screens. Statuses in this
addendum use the same vocabulary.

| Screen / control | Role(s) | Data source | Auth/permission source | States | Status |
|---|---|---|---|---|---|
| `/app/analytics` dashboard cards, charts, insights, targets, interventions | all roles with `analytics.read` | `useAnalyticsOverview/Insights/Targets/Interventions` → `GET /api/v1/analytics/**` (mock adapter in demo) | `useCan('analytics.read/configure/export')` from session; backend remains authoritative | loading/error/retry, empty, suppressed cells, freshness, "Données fictives" badge, offline notice, 403 card | mocked (identical contracts; real aggregates have no upstream source) |
| `/app/analytics/explore` (series, paginated table, matrix, explain, scenario, export) | analyst + any `analytics.read` role | `useAnalyticsSeries/Table/Matrix/Explain/Scenario`, `useAnalyticsExport` | same permissions; export requires step-up + `analytics.export` | same states; async export result shows row count + watermark | mocked |
| `/ui-kit/analytics` | dev only | static sample data from the UI kit | `VITE_SHOW_UI_KIT` gate | light/dark, suppressed, empty variants | hard-coded (no school data) |
| FilterBar URL sync (`apps/web/src/app/analytics.ts`) | all analytics users | `useSearchParams`; API supplies filter options via dictionary `meta` | no auth data in URL | reset, invalid values ignored, save/load in-memory views | partial (governed `GET/POST /api/analytics/views` exists but the UI does not consume it yet) |
| `MetricCard`/`ChartCard` disclosure | all | metric dictionary definition + response `meta` | n/a | n/CI/freshness in tooltip and aria summary; table alternative | wired to contract; data source mocked |
| Browser storage | all | **none** for analytics filters/views | n/a | URL is the single source of truth; views live in component state | wired (no localStorage/sessionStorage writes) |

**Mock boundary:** `packages/api-client/src/mock/analytics.ts` generates deterministic synthetic
facts from `packages/shared/src/analytics-demo.ts` and returns the same `data`/`meta` envelopes as
the Java API. Every response includes `meta.mock=true`, `sourceAvailable=false`, suppression
threshold, freshness and explain metadata; the UI shows a visible "Données fictives" badge.
Production client imports demo types only with `import type`, so no mock number can reach a
production path. The Java refresh job records `sourceAvailable=false` instead of inserting rows.
Real upstream facts will replace the adapter without changing UI contracts.
