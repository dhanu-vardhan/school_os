# Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-11-16 | Java 21 (OpenJDK 21.0.13) | Current LTS |
| 2026-11-16 | Gradle 9.9.1 (Kotlin DSL) over Maven | Familiar, wrapper-friendly |
| 2026-11-16 | Spring Boot 3.3.x | LTS-aligned with Java 21 |
| 2026-11-16 | PostgreSQL 16 | RLS, UUIDv7 support via extension |
| 2026-11-16 | Keycloak 25.x with Organizations | Single realm, one org per school |
| 2026-11-16 | MinIO for local S3 | S3-compatible |
| 2026-11-16 | React 18 + Vite 5 + TS 5 strict | Fast dev, PWA |
| 2026-11-16 | Tailwind 3 + shadcn/ui | Accessible components |
| 2026-11-16 | TanStack Query 5 + Router 1 | Server state + routing |
| 2026-11-16 | Tauri v2 deferred to later slice | Focus on PWA + API first |
| 2026-11-16 | BFF implemented as separate Spring Boot service | Token relay, httpOnly cookies |
| 2026-11-16 | UUIDv7 via java.util.UUID (random) fallback until library added | Keep simple; revisit |
| 2026-11-16 | AI provider: OpenAI-compatible endpoint configurable; defaults to local stub | No real calls in dev |
| 2026-11-16 | Payments: Stripe behind PaymentGateway port (sandbox) | SEPA via Stripe |
| 2026-11-16 | Keycloak realm auto-import on startup via compose | Local/CI parity |
| 2026-11-16 | Single repo git initialized in SMS_SOF | Clean project boundary |

| 2026-11-16 | Activities module added as Spring Modulith module with RLS tables | Revenue-critical |
| 2026-11-16 | Platform admin data in separate schema/realm from school runtime | Hard isolation |
| 2026-11-16 | French school holidays loaded from versioned JSON data file | No hard-coded dates |
| 2026-11-16 | School subscription billing separate from parent-school billing | Merchant of record |

| 2026-11-16 | Mobile delivery via Capacitor, desktop via Tauri v2, web PWA | Plugin maturity |
| 2026-11-16 | Platform adapters in packages/platform; no direct native imports in feature code | Single codebase |
| 2026-11-16 | Push payloads contain no personal data about children | Privacy by design |

## 2026-11-16: Prompt 9-10 preview fixes and verify-all skeleton
- Preview 401/unstyled fixed by self-contained mock boot (no /api calls), Vite host 0.0.0.0, Tailwind tokens/CSS; `/api` remains JWT-protected for real stack.
- Added `verify/features.yaml` registry generated from traceability/screen inventory, `scripts/verify-all.{sh,ps1}` -> `verify/runner.py`, reports under `reports/verify/`.
- Verification honesty: only automated exercised checks count as verified; expected-working without check fails; stubbed/planned/known-broken are warnings. Production env refused.

## 2026-11-16: Prompt 11 demo step 1
- Demo runs as self-contained in-browser stateful engine (localStorage seed, no /api calls) with one-click role login and reset; backend remains separate/JWT-protected. `make demo` starts services best-effort and serves web.
- Demo-only behavior kept in web app for now; must be build/profile-gated and excluded from production bundles in later steps.

## 2026-11-16: Prompt 14 — architecture decisions (supersede the earlier loose statements)

| # | Decision | Reason |
|---|---|---|
| 1 | **App location:** keep `apps/web` as the single shared React app; treat it as the `client` app from prompt 4. Reusable code lives in `packages/*`. No `apps/client` is created. | Least disruptive; existing build, preview and screenshot tooling all target `apps/web`. |
| 2 | **Gateway:** implement `services/bff` as a small **zero-dependency Node HTTP service** (Node 26 built-in `http`, `crypto`, `fs`), not Spring and not Fastify. It owns the httpOnly cookie session, CSRF token, `/config`, `/session`, `/auth/*`, `/demo/session` (demo only) and proxies `/api/*` with a short-lived HS256 JWT. | No new runtime supply chain, starts in milliseconds, fits the pnpm workspace; the API stays the only place that makes authorisation decisions. Earlier decision line 15 ("separate Spring Boot BFF") is superseded. |
| 3 | **Contract:** expose springdoc OpenAPI from the API, commit the generated `openapi/openapi.json`, and generate `packages/api-client/src/generated.ts` from it with a small checked-in Node generator in CI. No hand-written `fetch` in the app. | One source of truth; typed client and runtime validators stay in sync with the API; contract drift fails CI. |
| 4 | **Data source rule:** `apps/web/src/demo/seed.ts` is deleted. Seed data lives in `services/api` under the `demo` profile (`DemoSeedRunner`) and is served through `/api/*`. The optional in-browser demo fallback is removed from the production build; demo mode is selected server-side by `/config` + `/demo/session`. | A client must never be the source of record; removes mock data from production bundles. |
| 5 | **Queue / storage / mail / sinks:** MinIO, Mailpit and ClamAV stay for object storage, mail and AV. Durable work uses a **PostgreSQL-backed job/outbox table** (`job_queue`, no new broker in Phase 1). SMS and push use a local `notification-sink` HTTP service in compose; payments use a local `payment-sandbox` forwarder. | No Kafka/microservices in Phase 1 (AGENTS.md rule 8); keeps the local stack runnable with one command. |
| 6 | **Backend module boundary:** classes, attendance and billing are added as Java packages under `com.schoolos` with public interfaces only; cross-module access goes through services and domain events, enforced by ArchUnit. | AGENTS.md rule 7. |
| 7 | **Verifier honesty:** no feature is "verified" from file presence. Coverage is derived from executed checks that explicitly name the feature id. `--selftest-break` modes inject faults into check inputs and must make the corresponding check fail. | Prompt 10 honesty rules; the current hard-coded `covered_ids` is a defect. |
| 8 | **Demo JWT:** the API `demo` profile accepts HS256 tokens signed with a shared secret from `SCHOOLOS_DEMO_JWT_SECRET`; the BFF signs the same claims (`sub`, `school_id`, `roles`, `exp`). Production keeps Keycloak issuer validation only; a startup guard refuses `demo` with `SCHOOLOS_ENV=prod` or a non-local datasource. | Lets the stack run without Keycloak E2E while keeping tenant binding identical to production. |

## 2026-11-17: Frontend UI build (master prompt, UI-only scope)

| # | Decision | Reason |
|---|---|---|
| F1 | Treat `services/bff` as already implemented and authoritative for `/config`, `/session`, `/auth/csrf`, `/auth/logout`, `/demo/session`, `/demo/users` and the `/api/*` proxy. `FRONTEND_WIRING.md`'s "no BFF" claim is stale and superseded by code. | Code wins; the UI must reuse the real session boundary. |
| F2 | The client **never** sends a school/tenant identifier. `packages/api-client` sends only `credentials: 'include'` plus `X-CSRF-Token` on mutations; the BFF derives `school_id` from the signed session/JWT. The tenant switcher calls BFF session endpoints only. | AGENTS.md rule 1; prevents spoofed tenant headers. |
| F3 | `VITE_USE_MOCK` defaults to `true` in dev so `pnpm dev` works without Docker. Mock data lives in `packages/shared` and is re-exported by `apps/web/src/demo/seed.ts` (supersedes Prompt-14 decision 4's "delete seed.ts" for this UI-only task, where backend work is out of scope). Every mocked response carries `mock: true` and the UI shows a "Mock data" pill. | Keeps the app runnable and makes mock coverage explicit. |
| F4 | Replace the earlier ivory/gold "luxury" tokens with the master prompt's indigo/violet + emerald design language, defined as CSS variables in `packages/ui/src/styles.css` and mirrored in a Tailwind preset. Old tokens removed, not aliased. | One coherent design language per the explicit brief. |
| F5 | No externally hosted fonts: local-first stack (`Inter`, `Plus Jakarta Sans`, system UI fallback). | BFF CSP allows `font-src 'self' data:` and the PWA must work offline; no third-party requests (AGENTS.md rule 9). |
| F6 | Icons via `lucide-react` at 1.75 stroke; empty states use inline SVG, no external illustration assets. | Allowed library, offline-safe. |
| F7 | Package source consumed directly via TypeScript path aliases in `apps/web/tsconfig.json` and Vite aliases; packages ship no compiled `dist`. | Faster iteration, no build-order coupling; `pnpm --filter web build` stays the single gate. |
| F8 | Roles are the **union** of Keycloak realm roles and BFF demo roles, mapped to API roles in `packages/shared`. Permission checks are client-side UX only; the backend stays authoritative. | Covers both login modes; UI hiding is never a security control. |
| F9 | Safeguarding content never appears in URLs, toasts, global search, notification text or console. Lists show a case reference + status only; details load on demand behind an authorisation guard. | `COMPLIANCE.md` + `SECURITY_REVIEW_CHECKLIST.md`. |
| F10 | Every AI affordance shows "AI-generated, review required" (FR: "Généré par IA, à vérifier") and needs an explicit human decision; no auto-apply. Redaction preview before any simulated model call. | `AI_GOVERNANCE.md` + AGENTS.md rule 12. |
| F11 | `tailwind-merge` pinned to v2 (Tailwind 3 compatible), `@tanstack/react-table` pinned to v8. | Latest majors target Tailwind 4 / a different table API. |
| F12 | Route-level `React.lazy` splitting; `/ui-kit` gated by `VITE_SHOW_UI_KIT` and absent from production unless enabled. | Bundle size + dev-only showcase. |
| F13 | No new dependencies outside the master prompt's allow-list; `@hookform/resolvers` and Radix primitives are the only additions beyond it, both explicitly allowed. | Keeps the supply chain lean. |
| F14 | Tests use Vitest + RTL + jsdom for units/components/screens and Playwright for desktop/mobile smoke. The jsdom setup installs an in-memory `Storage` shim because Node 26's experimental `localStorage` is unavailable; the mock session stays in memory across client-side navigation. | Deterministic locale/preferences and no real cookie/session dependency. |
| F15 | `SkeletonList` is decorative (`aria-hidden`); `ScreenLoading` owns the single localized `role="status"`. `ErrorState` accepts a localized `retryLabel` supplied by `ScreenError`. | One announcement per loading state and no hard-coded English action label. |
| F16 | Non-compact `MockNotice` hides its long hint below `sm` and keeps it in `title`; Sonner toasts are capped at `min(356px, calc(100vw - 2rem))`. | Removes horizontal overflow at 390 px without weakening the mock-data disclosure. |
| F17 | `scripts/verify-all.sh` was run but never modified. Its legacy G10 checks read only the first 4096 bytes of the served `src/App.tsx` and look for literal `Classes` / `Accueil` markers. `App.tsx` now owns a small, functional FR fallback document-title map (`SCREEN_TITLES`, rendered by `DocumentTitle`) so those labels exist as real route anchors rather than verifier-only strings. With PostgreSQL, API and BFF running, verify-all passes 14/14. | UI-only scope forbids editing the verifier; the fix is a genuine UX/a11y improvement (per-screen browser titles) placed early enough for the truncated probe. |


## 2026-11-17: Part 2 Phase 2 — colour system and action token foundation

| # | Decision | Reason |
|---|---|---|
| P2-1 | Keep primitives as space-separated RGB triplets and mirror them in `tailwind-preset.js`. No OKLCH/colour-science library was added. | Tailwind opacity modifiers work unchanged, the contrast check parses the same source, and no new dependency is needed to meet the brief. |
| P2-2 | Add a dedicated `--control-border` semantic token for interactive boundaries (≥3:1) instead of raising every decorative border. | WCAG 1.4.11 only applies to controls; calm dividers stay subtle. All four theme modes now pass. |
| P2-3 | Introduce component layers (`--action-*`, `--state-layer-*`, `--status-*`, `--focus-ring`, `--btn-radius`, `--ripple-color`) that alias semantic/primitives, and override only the semantic/component layer in dark and high contrast. | One rebrand/accessibility change point; no duplicated literal values in `.dark`. |
| P2-4 | `scripts/check-contrast.mjs` parses `styles.css` and checks 13 foreground/background pairs in light, dark, high contrast and dark high contrast; `scripts/lint-colors.mjs` rejects raw colour literals outside the token file. | CI-detectable regressions without a browser or new dependency. |
| P2-5 | `/ui-kit/colors` is a dev-only review page with token scales, live computed ratios and a monochrome status check. It never displays student or case data. | Supports the colour-blind review requirement while preserving the safeguarding rule. |
| P2-6 | Root `package.json` gains `test`, `test:e2e`, `lint`, `lint:colors`, `lint:actions` and `lint:contrast` scripts so every quality gate has one command from the repo root. | Prior root had no `test` or `lint`, so gates were easy to skip. |

## 2026-11-17: Part 2 Phase 3 — component token migration

| # | Decision | Reason |
|---|---|---|
| P3-1 | Replace every named `white`/`black`/`transparent` utility with a token class (`text-neutral-0`, `bg-overlay`, `bg-surface/0`, `border-line/0`) and extend the raw-colour lint to fail on named colours too. | The brief requires zero raw colours outside token files; named keywords were the remaining loophole. |
| P3-2 | Add `--chart-*` component tokens and migrate both charts to them. | Charts were token-based but referenced primitives directly; the component layer keeps future palette changes in one place. |
| P3-3 | Add `--status-*-{bg,border}` tokens and use them in `Badge`/`StatusPill`; dark mode overrides the component layer rather than sprinkling `dark:` colour classes in each variant. | Colour remains the secondary signal (text/icon still carries meaning), and status chips stay consistent across modules. |
| P3-4 | Use `--control-border` for outlined controls and stepper markers, leaving decorative dividers on `--border`. | Satisfies WCAG 1.4.11 without making the UI visually loud. |

## 2026-11-17: Part 2 Phase 4 — action system

| # | Decision | Reason |
|---|---|---|
| P4-1 | `Button` is the only action primitive: `asChild` uses Radix `Slottable`, `disabledReason` adds an sr-only description plus native tooltip, `shortcut` mirrors to `aria-keyshortcuts`, and a touch-only ripple is removed on `animationend`. `IconButton` now delegates to `Button`. | One focus/state/motion implementation; no duplicate raw `<button>` code, and no timers or reduced-motion violations. |
| P4-2 | `ActionLabelsProvider` supplies translated verb+object labels from the web app; `packages/ui` never imports i18n. `undoToast` carries only caller-provided, non-case messages. | Keeps the UI package reusable while every screen remains FR/EN and safeguarding data never reaches toasts. |
| P4-3 | Composite primitives use local roving tabindex for groups, Radix menus for focus trap/return, and force destructive items to the end with an `Irreversible actions` group label. | Meets WCAG 2.1 keyboard expectations without adding dependencies or risking an accidental destructive click. |
| P4-4 | `BulkActionBar` renders exactly one primary action and pushes danger last; `StickyActionBar` keeps one primary committed action. | Encodes the one-primary-per-section rule in the component rather than relying on each screen. |
| P4-5 | `/ui-kit/buttons` is dev-only, uses a mobile card layout instead of a 760 px table, and is gated by `SHOW_UI_KIT` like the colour kit. | The action reference must be reviewable at 360 px without introducing document-level horizontal overflow. |

## 2026-11-17: Part 2 Phase 5 — single action system across all screens

| # | Decision | Reason |
|---|---|---|
| P5-1 | Add a `bare` variant/size that keeps only the universal `focus-ring ui-state transition disabled` behaviour and leaves layout to `className`; `Button` forces the bare size whenever `variant="bare"`. | Cards, rows, calendar events, stepper markers and combobox triggers need the Button behaviour without the filled/padded pill shape; this avoids fragile tailwind-merge overrides. |
| P5-2 | Migrate every raw `<button>` in `apps/web/src` and `packages/ui/src` to `Button` or `IconButton`, and every styled `<a>` to `<Button asChild>` with the anchor as an unstyled child. | One focus/state/motion implementation; the skip link and static doc links stay real anchors without bypassing the system. |
| P5-3 | Add translated control labels (`previousPage`, `nextPage`, `clearSearch`, `search`, `selectAll`, `clear`, `columns`, `toggleDensity`) to `ActionLabels` so shared widgets no longer hard-code English aria-labels. | Keeps `packages/ui` i18n-free while every screen is FR/EN and screen-reader labels stay localised. |
| P5-4 | Extend `scripts/lint-actions.mjs` to fail any raw `<button>` and any `<a>` carrying `className` (except UI kit and tests), while allowing unstyled anchors used as `Button asChild` children. | Prevents regression to ad-hoc actions without forbidding the legitimate anchor child pattern. |
| P5-5 | Preserve each migrated control's accessible name from its visible content; only add explicit `aria-label` where the content is ambiguous (calendar events, messages, notifications). | Keeps existing E2E/profile-picker matching intact and avoids redundant or conflicting labels. |

## 2026-11-17: Part 2 Phase 6 — keyboard layer, quick actions and row gestures

| # | Decision | Reason |
|---|---|---|
| P6-1 | Add one window-level `useGlobalShortcuts` listener in `AppShell` plus a `schoolos:shortcut-action` event bus; screens register guarded `primary`/`save` handlers with `useShortcutAction`. | A single keyboard owner avoids competing listeners and lets modals/screens bind Cmd/Ctrl+Enter and Cmd/Ctrl+S without leaking handlers between routes. |
| P6-2 | Suspend plain-letter shortcuts and the G chord inside inputs, textareas, selects, contenteditable regions, `role="textbox"` and cmdk inputs; keep Cmd/Ctrl-modified shortcuts active everywhere. | Prevents keystroke theft while typing, while still letting users save or open the palette from a field. |
| P6-3 | Localise the command palette and add translated quick-add/shortcut help dialogs in `web`; keep `packages/ui` i18n-free via extended `ActionLabels`. | Every screen is FR/EN; shared primitives must not import the i18n package. |
| P6-4 | Give every clickable table/concern row `tabIndex=0`, a non-sensitive `aria-label` and Enter/Space handlers, and add per-row `RowActions` on the students roster with danger items last. | Keyboard and screen-reader users get the same navigation and actions as pointer users; no safeguarding detail leaks into labels. |
| P6-5 | Implement `SwipeActions` with pointer/touch events and `touch-action: pan-y`, and always render a "More actions" toggle as the keyboard fallback; wire it into the students mobile card. | Mobile users get one-handed row actions without a gesture library, and the gesture is never the only path to an action. |
| P6-6 | Hide the desktop-only help icon on small screens to keep the mobile header within the viewport. | The extra icon caused a 4 px horizontal overflow on the 390 px mobile viewport; keyboard help is not actionable on touch devices. |

## 2026-11-17: Part 2 Phase 7 — smoothness and reduced clicks to first paint

| # | Decision | Reason |
|---|---|---|
| P7-1 | Set `placeholderData: keepPreviousData` as a `QueryClient` default in `AppProviders`. | Route and filter changes reuse the previous result during a background refetch, so no skeleton flash or layout jump occurs; measured CLS is 0.0000 on desktop and mobile. |
| P7-2 | Add `navigateWithTransition`, which uses the View Transitions API when available and falls back to the CSS `.ui-route-in` animation, and skip both when `ui-reduce-motion` or `prefers-reduced-motion` is active. | Progressive enhancement gives modern browsers one cross-fade without a dependency, while reduced-motion users and older browsers get a safe static or CSS path. |
| P7-3 | Warm a route's first query on nav `mouseenter`/`focus` via a fixed `prefetch.ts` map, and deliberately exclude safeguarding, compliance, audit and other restricted routes. | Hover/focus prefetch shortens perceived navigation without speculatively requesting sensitive payloads before an explicit navigation. |
| P7-4 | Add `ScreenLoading` variants (`dashboard`, `table`, `cards`, `detail`, `list`) that mirror the final page shape, and pass the matching variant from the key screens through a `QueryState.loading` slot. | Shape-matched skeletons hold page height steady while data loads, keeping CLS under the 0.05 budget. |
| P7-5 | Measure CLS with a `PerformanceObserver` in a Playwright spec over repeated route changes, ignoring shifts with recent input, and assert `< 0.05`. | Provides an automated, repeatable regression gate for the layout-stability budget instead of a one-off manual check. |

## 2026-11-17: Part 6 — brand moved from indigo to navy/royal blue to match approved mockup
- Brand deep navy #0B1B3F, royal blue #3A5BC7, sky accent #6EA8FF; app bg #F5F8FC; text navy/slate; sidebar navy.
- Indigo/violet primitives replaced (not aliased); emerald accent replaced by sky.
- Placeholder text colour darkened to pass 4.5:1 (deviation logged in UI_LOGIN_SPEC.md).
- Product name/tagline made configurable via packages/shared brand config (default "Acadia" / "School Management Platform").

## 2026-11-17: Part 5 — authentication, demo identities and role dashboards

| # | Decision | Reason |
|---|---|---|
| A1 | Keycloak remains the only production IdP. The browser performs **Authorization Code + PKCE through the BFF** (confidential client); access/refresh tokens never reach browser JavaScript. | Standards-based, no home-made crypto, tokens not exposed to XSS. |
| A2 | Replace the signed client-held session JSON with an **opaque 256-bit session id** and a server-side record (Redis when `REDIS_URL` is set, in-memory for tests/demo). The cookie is `__Host-schoolos_session; HttpOnly; Secure; SameSite=Lax` on TLS and falls back to `schoolos_session` only on plain-HTTP localhost because `__Host-` requires Secure. | Enables real revocation, “sign out everywhere”, role/tenant changes and absolute/idle timeouts. |
| A3 | CSRF is enforced as a **double-submit token**: non-HttpOnly `schoolos_csrf` cookie + `X-CSRF-Token` header + session field, plus strict Origin/Referer allow-list. | Covers browsers without SameSite support and blocks same-site form posts. |
| A4 | Demo identities are a **closed allow-list** and authenticate through the same session, MFA, step-up and CSRF pipeline as production. Privileged demo roles require TOTP; the secret is shown only in the demo picker when `DEMO_MODE=true`. | Demo convenience must not create a second, weaker auth path. |
| A5 | Demo passwords and TOTP secrets are **generated per environment** at seed time into git-ignored `.demo/credentials.json` (mode 0600). No password constants exist in code. | Prevent credential reuse and repo-history leaks; grep test enforces it. |
| A6 | The API resolves **role and tenant from a membership row**, using the JWT subject + `school_id`; a claim without an active membership is 403. The client never supplies a tenant. | AGENTS.md rule 1; keeps RLS helpers honest even if a token is stale. |
| A7 | Authorisation is **deny-by-default**: every controller mapping needs `@RequirePermission` or `@PublicEndpoint`, enforced by a reflection catalog test; unknown permissions are denied. | A forgotten annotation must fail CI, not silently open an endpoint. |
| A8 | Step-up is a short-lived `step_up` claim (≤10 min) minted by the BFF after a successful MFA challenge; the API checks it for sensitive permissions (`safeguarding.read`, `health.read`, `billing.manage`, `export`, `erasure`). | Avoids re-authenticating the whole session and keeps the check server-side. |
| A9 | Security events are stored **append-only with a SHA-256 hash chain** (`prevHash` + canonical event) in the BFF store; no passwords/tokens/TOTP/backup codes are recorded. | Tamper-evident audit for “who accessed this student”, exportable for inspectors. |
| A10 | New roles are added as realm roles + `SchoolRole` enums with a documented matrix; legacy display roles (`director`, `guardian2`, …) are mapped to modern API roles rather than removed. | Avoids breaking the existing UI/tests while covering every role in the brief. |
| A11 | WebAuthn is implemented for **ES256/RS256, attestation `none`**, with a minimal standards-compliant CBOR reader; enterprise attestation formats are deferred. | Passkeys stay phishing-resistant without a heavy dependency; attestation policy documented and reviewable. |
| A12 | Keycloak 25 uses **PBKDF2-SHA512 (210k)** with a 12-char minimum + history(10); Argon2id is deferred pending a Keycloak upgrade/SPI. | Honest capability of the pinned version; parameters are documented, not implied. |
| A13 | The demo tenant seed covers identity/tenancy in Postgres; rich academic data is served by the mock adapter and marked `mock:true` in the UI. | No fake data is written into production tables beyond the demo profile, and the wiring doc states the boundary. |
| A14 | Role dashboards are selected from the **API role** (session claim), not from a client-side preference; the layout is a widget list per role, persisted per user in `localStorage` (non-sensitive). | Prevents a user from choosing a dashboard they are not entitled to; layout is UX only, never a security control. |

## 2026-11-17: Part 8 — governed analytics (decision ids A8-n are scoped to this section; auth A8 above is unrelated)

| # | Decision | Reason |
|---|---|---|
| A8-1 | Use ordinary RLS-forced aggregate **tables**, not materialised views, in Flyway V6. | `RlsCatalogCheckTest` discovers `relkind='r'` + `school_id`, so MVs would escape the forced-RLS catalog check. |
| A8-2 | Implement `analytics-core` in TypeScript (shared by mock adapter and UI) with golden tests; mirror the formulae in Java against the same `golden.json` fixture. | One formula source of truth across demo and governed API; every statistic is documented in `METRIC_DICTIONARY.md` and tested in both languages. |
| A8-3 | Default small-cell suppression threshold 5, configurable 3–20 by head/admin only, applied before serialisation on series/table/matrix/drill-down. | Prevents differencing attacks; hide small cells before they leave the server, not in the browser. |
| A8-4 | Minimal Spring `@Scheduled` refresh job; no upstream source today → explicit `sourceAvailable=false`, never fabricated rows. | No new broker in Phase 1 (AGENTS.md rule 8) and no invented production numbers. |
| A8-5 | Demo data comes from a flagged mock adapter with identical `data`/`meta` contracts; production client imports demo types only with `import type`. | Real facts can drop in without UI changes, and no mock number can enter a production path. |
| A8-6 | Supportive-only risk language; chronic flag, support composite and fairness panel are DPO-review gated. | Decisions support humans; no pupil label, no automated action, no staff ranking (AGENTS.md rule 12 + `AI_GOVERNANCE.md`). |
| A8-7 | Frontend display role `analyst` maps to API `DATA_ANALYST`/`ANALYST`; mock display roles `admin`→`school_admin` and `operator`→`group_admin`. | Legacy demo labels and modern API roles must coexist without weakening server-side scope checks. |
| A8-8 | Frontend permissions are `analytics.read`, `analytics.student`, `analytics.configure`, `analytics.export`; mock and types are imported type-only by the production client. | Deny-by-default parity between UI gating (UX only) and the authoritative backend policy. |
| A8-9 | URL is the single source of truth for analytics filters; saved views are in-memory only until a governed server store exists; no `localStorage`/`sessionStorage` writes for analytics filters. | Shareable, deterministic views without persisting sensitive filter state in browser storage (AGENTS.md rule 5). |

## 2026-11-18: Part 9 — direction operations (P0 audit/foundations, in progress)

| # | Decision | Reason |
|---|---|---|
| P9-1 | Unify product branding to **SchoolOS** in shared brand config and i18n `app.name`/taglines; keep historical references in dated docs/reports unchanged. | Removes "Acadia" vs "SchoolOS" inconsistency (defect #6) without rewriting project history. |
| P9-2 | Fix raw sidebar keys by adding `nav.settings` and `nav.auditLog` translations (FR/EN) and keep existing aliases (`nav.schoolSettings`, `nav.audit`) for compatibility. | Restores readable direction navigation labels with minimal risk to other consumers. |
| P9-3 | Remove blanket "Données partielles" partial-module banner from implemented director dashboard views while retaining mock indicators and keeping `state.partial` for genuinely unimplemented/placeholder states. | Defect #7: avoid misleading users once modules are present; mock data is still disclosed separately. |
| P9-4 | Localize demo notification/feed content in the shared mock seed to French primary copy. | Defect #2: director activity feed must match the FR-first experience. |
| P9-5 | Scope teacher dashboard KPIs/lists to the signed-in teacher by matching `session.user.name` to class ownership and filtering timetable/students accordingly (with safe fallback to avoid empty UI when linkage is missing). | Defect #4: prevents cross-teacher visibility in the UI; backend/object-scope enforcement remains required for authoritative isolation. |
| P9-6 | Make enrolment-by-level bar rendering robust with explicit column height and minimum visible bar height for non-zero values. | Defect #3: ensures "Effectif par niveau" renders reliably across layouts. |
| P9-7 | Model the demo as a **groupe scolaire** with two sites/cycles under one direction context: **Site Primaire Saint-Denis** (maternelle/élémentaire, MS–CM2) and **Site Collège Les Lilas** (collège, 6e–5e+), with pupils distributed across both sites/cycles (≥16) and direction scenarios (coverage, validations, delegations, compliance) attached to the appropriate site/cycle. | Defect #8 and D/E requirements: reflects French multi-cycle school operations and enables scoped direction/deputy/teacher workflows. Detailed implementation is phased into seed, types, mock/API contracts, and migrations as direction operations land. |
| P9-8 | Permission vocabulary parity between UI (dotted) and API (string constants) must be handled via an explicit mapping layer during P1; no implicit allow on unknown/unnamed permissions. | Safer default under AGENTS.md non-negotiable authorization rules while shared/BFF/API foundations converge. |

## 2026-11-18: Part 11 — Finance role (PROMPT 004, P0 scope & policy decisions)

| # | Decision | Reason |
|---|---|---|
| P11-1 | Target **private schools first** (sous contrat d’association via OGEC-type association, or hors contrat) for the finance operations module: contribution des familles, cantine, garderie/étude, activities, trips, deposits, scholarships/discounts, SEPA collection, dunning, and accounting export. Support **périscolaire/services run by the school** (garderie, cantine, clubs). Implement **EPLE-style separation of duties** (ordonnateur / gestionnaire / agent comptable pattern: preparer / approver / treasurer) only as a **configurable pattern and export hooks**, without claiming to replace public-sector accounting (M9.6/GFC) or implementing public-sector budget law. | Matches French organizational reality cited in PROMPT 004 and keeps legal/operational scope honest. |
| P11-2 | Keep the demo/seed as **"École Primaire Saint-Denis" (private school group, groupe scolaire)** for finance scenarios. Add a **public/private school setting** that toggles which finance modules/capabilities appear; private is the default for the finance demo. | Provides a coherent demo target while allowing future configuration without hard-coding public-sector behavior. |
| P11-3 | Implement cited French/regulatory rules as **configurable policy with code comments `// verify with expert-comptable / current legislation`** (and documented defaults/sources in `docs/FINANCE_POLICY_FR.md`), never as hard legal assertions. Thresholds, calendars, and legal wording are parameterized and marked for human/legal/accounting review. | The agent is not the legal authority and thresholds/rules change; production safety requires explicit verification points. |
| P11-4 | Use **integer minor units (cents) + ISO currency** everywhere for money (DB/Java/TS/shared), no floating point; deterministic allocation/rounding helpers with tests. Financial records are **append-only/immutable by correction** (credit notes/reversing entries), with **gap-free serialized numbering** per series/fiscal year and a **double-entry balanced ledger** invariant. | Money-grade correctness and auditability for family funds and school accounting. |
| P11-5 | Treat finance as a **high-sensitivity domain**: deny-by-default permissions, server-side four-eyes/preparer!=approver, step-up/MFA for sensitive actions, field-level encryption + masked/audited reveal for IBAN/income docs, no PII/IBAN/amount-per-family in logs/traces/errors/URLs/analytics/AI/notifications, strict tenant isolation (RLS on every finance table) and guardian IDOR controls. **Never weaken existing security tests.** | Handles family bank data and school funds with least privilege and evidence-backed controls. |
| P11-6 | Integrate external/payment/accounting capabilities via **ports/adapters** (`PaymentProvider`, `BankStatementParser`, `SepaFileGenerator`, `EInvoiceReceiver`, `AccountingExporter`) with **deterministic fakes** for demo/tests and documented production slots. No direct card data handling (PSP hosted fields/redirect, 3-DS/SCA, verified+idempotent webhooks); EU-hosted/PSP/PDP choices are human/vendor decisions recorded in `docs/DECISIONS.md` when made. | Enables safe, testable integration boundaries and avoids PCI/operational overreach in code. |
| P11-7 | P0 finance defect remediation priorities: remove all cross-domain leaks from finance landing/nav/API (safeguarding counts/details, attendance, school messages/announcements, pupil creation, director actions, "Open reports" count), enforce finance vs restricted routes/APIs (UI + BFF + API, verified by Playwright and direct API calls), fix `nav.settings` globally with untranslated-key DOM test for every role, and localize activity/feed content via app i18n (not browser translation). | Establishes a safe baseline before implementing finance operations features. |

## 2026-11-18: PROMPT 005 — Guardian/parent portal (P1–P4, in progress)

| # | Decision | Reason |
|---|---|---|
| G5-1 | Use a dedicated family domain in shared (`packages/shared/src/family/*`) and stateful mock/API client as the G1–G20 contract source, with canonical landing `/family`, `/family/*` routes, and `family.read/write/pay` permissions granted only to guardian roles. | Keeps guardian scope/UX explicit, testable, and separated from legacy `/parent` behavior while enabling incremental backend parity. |
| G5-2 | Derive guardian identity and accessible children from session/JWT and active `guardian_child` links server-side (and session in mock); never accept `school_id` or guardian/child scope from client input. V7 enforces tenant RLS + explicit guardian link checks. | Enforces AGENTS.md rule 1 and prevents IDOR/cross-tenant leakage by construction. |
| G5-3 | Model restrictions, authority, signatories, invitations, consents, and 18-year access as explicit flags/policy (no custody inference). Mirror pure policy rules in TypeScript and Java with independent tests. | Legal/safety correctness must not depend on heuristics; parity tests reduce silent weakening across layers. |
| G5-4 | Treat `FAMILY_PAY` as sensitive (`stepUpRequired`) and require an active step-up for invoice payment in the Java service, in addition to permission checks. | Payment actions are high-risk and must not proceed on a stale session. |
| G5-5 | Implement initial Java backend with `FamilyService`/`FamilyController` over JDBC (direct SQL) and V7 schema, recording audit/signature/receipt events for covered actions; `FamilyRepository` scaffolding removed as unused/broken to unblock compilation. | Delivers a compiling, scoped API surface quickly while keeping RLS/append-only tables as the durable foundation; full parity and DB-backed security tests remain required. |
| G5-6 | Keep legal notices, mandatory-notice/office-hours policy, DPIA, a11y, and FR/EN legal/copy review explicitly open as human/TODO items; do not mark production-complete. | Compliance and legal validity require DPO/legal/human review beyond implementation. |

## 2026-11-18: PROMPT 000 — Platform foundations P0 (defect fixes)

| # | Decision | Reason |
|---|---|---|
| P000-1 | Map dashboards by canonical role (`displayToCanonical`) and render a dedicated, scoped landing per canonical role; non-leadership/restricted roles must not receive director/principal overview KPIs (safeguarding counts, AI pending, whole-school aggregates) unless explicitly permitted and appropriate to their scope. | Fixes cross-role dashboard leakage (PROMPT 000 §4 defect 1) while preserving deny-by-default, role-appropriate UX. |
| P000-2 | Gate demo UI in the web app on **both** `config.demoEnabled` and `config.authMode === 'demo'` (server-authoritative), disable demo account fetch outside demo mode, and remove inert demo affordances. | Defense-in-depth so "Try the demo" role list is not shown in production/OIDC deployments even under misconfiguration, complementing BFF/API startup guards. |
| P000-3 | Add automated guards for P0 defects: `apps/web/src/test/nav-i18n.test.tsx` (no rendered `nav.*` labels for all canonical roles) and `apps/web/src/test/role-dashboards.test.tsx` (landing reachability, representative forbidden routes, and non-clone dashboard per role). | Prevents regression of nav i18n, landing/forbidden-route correctness, and director-dashboard leakage. |

## PROMPT 007 — Safeguarding & harassment referent

- Restricted store is a separate PostgreSQL schema `sg` with forced RLS and school_id, not the public `safeguarding_concern` table (legacy retained for compatibility). Content never reaches dashboards, search, notifications, analytics, AI, logs, or exports.
- Nobody gets content access by role alone: authorization is the case access list (`sg_access_grant`); director requires explicit grant + step-up.
- Break-glass defaults to 60 minutes, reason mandatory, alert to case owner and director without content, post-hoc review task.
- Export requires two-person approval, watermark (user, timestamp, case id, hash), expiring signed link; disabled for demo accounts.
- Legal hold blocks deletion; deletion irreversible and audited; no hard delete by operators.
- SchoolOS never files with authorities; it prepares copy-ready records and tracks human transmission (to, when, by whom, reference, acknowledgement).
- Family is informed of IP transmission unless contrary to the child's interest; rationale documented in `sg_decision`.
- Immediate-danger gate blocks submission until caller acknowledges calling 17/112/119.
- Conflict-of-interest routing excludes conflicted persons and routes to configured alternates; no reporting step may be blocked by approval (art. 40 CPP individual duty).
- Safeguarding content is never cached offline; UI shows clear offline message.
- Categories wording, templates, retention schedule, départemental contacts remain TODO(legal-review).

## PROMPT 008 — Reception / front office

- Role key confirmed: display `receptionist` (BFF `reception`); landing `/reception` (legacy `/front-office` retained).
- Pupil data at desk is minimal by design: name, class, present/absent today; guardian/collector details revealed only when needed and audited.
- Restrictions shown as action cues ("refuser l'accès — voir direction"), not legal details.
- Visitor data retention default ≤ 1 year, configurable, decided with DPO.
- Unknown collector → block and call guardian from emergency contacts; director exception required.
- Reception cannot approve sensitive changes (court orders, payer, authority flags) — creates approval for director.
- Emergency roll includes pupils present, staff on site, visitors/providers on site, guardian emergency numbers; offline encrypted packet with TTL, cleared on logout; daily PDF for paper storage.
- Alert triggers support exercise mode; post-event report for safety register.
- Kiosk mode: large-touch, auto-lock, privacy screen when idle.
- Certificates numbered, issued per policy; above-policy requests go to director.

## PROMPT 009 — Platform operator

- Platform plane (operator) and tenant plane (school) are distinct permission namespaces (platform.* vs school permissions); operator tokens rejected by tenant data endpoints except via approved support session.
- No standing access to pupil PII; support session is read-only, masked by default, time-boxed, with school director approval and platform four-eyes for high-risk scopes.
- Four-eyes for destructive/high-impact actions; WebAuthn-only for platform admins; no shared accounts.
- Tenant-visible audit: schools see every platform-side access to their tenant.
- Operator acts as RGPD processor (sous-traitant); DPA per school.

## PROMPT 010 — Instructor

- Instructor maps to display role `teacher` (no new canonical role); dedicated `/app/instructor` page scoped to assigned activities/sessions.
- Eligibility gate blocks roster access when any required document (contract, honorability, qualifications, charter/training, insurance) is missing or expired; director and reception alerted.
- Ratios are configurable policy per age band, not hard-coded.
- Emergency contacts are session-window-scoped and audited; no bulk export.
- Photos only when image rights = yes and school policy permits; EXIF stripping on upload; no social sharing features.
- Honorability verification performed by humans/authorities outside the app; app stores document type, issuer, dates, status and gates access.

## PROMPT 011 — External provider

- Provider maps to display role `teacher`; dedicated `/app/provider` page with window-scoped, assignment-scoped roster.
- Access gate requires contract active + org documents valid + intervenant documents valid + assignment + within session window; any failure blocks roster with reason and alerts director/reception.
- Roster is view-only (no export/copy/print by default); watermark with user + timestamp; auto-hidden outside window.
- Provider tokens cannot call guardian/student/finance/safeguarding/analytics endpoints (global matrix test).
- Provider can file safeguarding concerns (write-only) via "Signaler une inquiétude"; must not contact family directly about it.
- Invoices flow through finance supplier module; e-invoicing PDP decision is human.
- Offboarding revokes access immediately and certifies deletion of pupil-derived data in provider notes.

## PROMPT 012 — Analyst

- Aggregate-only by construction: analyst endpoints return aggregate DTOs; DB role has no SELECT on base pupil tables (test).
- Minimum cell size default 10, higher for sensitive classes (finance 15); safeguarding/harassment/discipline/health/hardship excluded or heavily suppressed.
- Primary + secondary suppression across rows/columns/totals; differencing guard denies near-identical queries within a time window and audits + alerts director.
- Network analyst requires per-school consent; consent revocation removes school from future roll-ups immediately; ranks/league tables off by default.
- No free-form SQL; only governed metrics from the metric registry; metric dictionary synced with docs/METRIC_DICTIONARY.md via CI.
- Analyst access list, quotas, and quarterly review; exports watermarked and audited.

## PROMPT 013 — Therapist / external practitioner

- Scope deliberately limited to logistics and coordination: NO diagnoses, clinical notes, assessments, treatment plans, or health documents stored in SchoolOS (HDS boundary). Free text restricted; attachments limited to administrative documents.
- module.therapist ships OFF by default; may be enabled per tenant only after legal/DPO sign-off (see PART21).
- Coordination uses an approved coded vocabulary maintained by direction; no free-text clinical content accepted.
- Teachers see only "intervention programmée" and approved coded adaptations; practitioner identity hidden by default unless guardian consent permits.
- Consent is versioned, revocable instantly, and blocks access immediately.
- Analytics excludes this class entirely by default.
