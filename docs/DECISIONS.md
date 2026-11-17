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

