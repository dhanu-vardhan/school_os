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
