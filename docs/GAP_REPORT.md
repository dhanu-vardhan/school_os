# Gap report (corrected 2026-11-16, Prompt 14)

Source of truth: the repository tree and file contents read on 2026-11-16. The previous
version of this file was a risk-ranked wish list and contained a broken shell heredoc;
it is replaced by an evidence-based table. Statuses: **real** (working code behind it),
**partial** (schema or interface only), **empty** (directory with no files), **missing**.

## Corrections to the Prompt 14 table (code wins)

| Prompt claim | Actual repository state | Correction |
|---|---|---|
| "no evidence of object storage, mail sink in compose" | `docker-compose.yml` already defines `minio` (9000/9001), `mailpit` (1025/8025), `clamav` (3310) | Partially wrong: storage, mail sink and AV exist; they lack healthchecks and `depends_on`, and are not wired to the API. No queue, SMS/push sink, inference gateway, vector store, observability stack, payment forwarder or operator realm exists. |
| "No OpenAPI contract visible" | `springdoc-openapi-starter-webmvc-ui:2.6.0` is a Gradle dependency and `/v3/api-docs/**` is permitAll in `SecurityConfig` | Partially wrong: OpenAPI is available at runtime but no spec is committed and no client is generated from it. |
| "Activities has two entity classes and no registration/session/waitlist" | `Activity.java`, `ActivityOffering.java` are the only Java classes, but `V2__activities_safeguarding_retention.sql` already creates `activity_session`, `activity_registration`, `activity_attendance` and `consent_record` tables (RLS forced) | Partially wrong: DB schema exists; Java/service/API/UI do not. |
| "RlsCatalogCheckTest exists" | Exists and queries `pg_class.relforcerowsecurity` for every table with a `school_id` column | Correct, but it runs only against the live test DB (Testcontainers), not as a CI catalog check on Flyway output. |
| "verify says verified" | Latest report `reports/verify/20261116T223814Z` is `PASS 10/10` but 122 features are warnings and `covered_ids` is a hard-coded set of 8 ids | Verifier is dishonest: 8 features are reported covered with no executed check. `--selftest-break` is unimplemented. This is a defect, scheduled for Slice 0 repair. |
| "apps/web builds" | `dist/` and `tsconfig.tsbuildinfo` are committed build output; `src/App.tsx` is a 206-line in-browser demo engine using `localStorage` and `src/demo/seed.ts` | Correct that it builds; the app is a mock, not wired to BFF/API. Build output must be ignored. |

## Real, working slices today

| Area | Evidence | Status |
|---|---|---|
| API tenancy/security | `TenantAwareDataSource`, `TenantJpaTransactionManager`, `TenantResolutionFilter`, `SecurityConfig` | real (JWT resource server, transaction-local `set_config`) |
| API people | `Student` entity/repo/service/controller (`/api/v1/students`) | real but minimal |
| API activities/safeguarding/lifecycle | Java entities, V2 schema | partial (no service/controller/workflow) |
| AI ports | `TextModel`, `EmbeddingModel`, `Ocr`, `SpeechToText`, `Translator`, `AiSuggestion`, `RedactionService` + `RedactionServiceTest` | real interfaces + one tested implementation; no wiring |
| Migrations | V1, V2, V3, all with forced RLS | real |
| Holiday data | `fr-holidays-zone-c.json` | real data file, unused by code |
| Infra | Postgres, Keycloak (one realm), MinIO, Mailpit, ClamAV in compose | partial (no healthchecks/dependency order for 3 of 5) |
| Web | Vite/React/Tailwind luxury tokens, styled director Classes screen | real UI shell but 100% in-browser mock data |
| Verify | `runner.py`, registries, 9 report runs | partial and dishonest (see above) |

## Empty or missing — each scheduled to a slice

| # | Gap | Evidence | Slice |
|---|---|---|---|
| 1 | `services/bff` empty: no cookie session, PKCE, CSRF, `/session`, `/config`, `/demo/session`, proxy | empty dir | Slice 0 |
| 2 | Web is a client-side mock (`App.tsx`, `demo/seed.ts`); no routes/pages/layout/components; `public/` empty | 4 files in `src/` | Slice 0 (server seed) + Slice 1 |
| 3 | `packages/ui`, `packages/i18n`, `packages/shared`, `packages/api-client` empty; `platform` has web+mock only | empty dirs | Slice 1 |
| 4 | Decision `apps/web` vs `apps/client` not recorded as a Prompt-14 decision | DECISIONS.md silent | Step 1 (keep `apps/web`) |
| 5 | Backend modules missing: classes/year/term/membership, attendance, observations, care, messaging, announcements, calendar, forms/signatures, admissions, billing/SEPA, notifications, files, search, audit, exports, staff, facilities, inclusion, support, operator, subscription billing, analytics | only tenancy/people/activities/safeguarding/lifecycle/ai Java packages | Slice 2 (classes), Slice 3 (attendance/messaging), Slice 4 (billing/activities), Slice 5 (rest) |
| 6 | No committed OpenAPI spec, no generated client | no spec file | Slice 1 |
| 7 | Infra: no bff, queue/job table, SMS/push sink, inference gateway, vector store, observability, payment forwarder, operator realm, terraform | compose/terraform dirs | Slice 0 (bff+sinks), Slice 5 (operator/realm) |
| 8 | Desktop/mobile shells empty | empty `src-tauri`, `android`, `ios` | Deferred per prompt 8 §12 — do not touch before web gate |
| 9 | Missing docs: `PERMISSIONS`, `CONVENTIONS`, `E2E_MATRIX`, `BACKEND_GAPS`, `KNOWN_LIMITATIONS`, `ONBOARDING_DEV`, `CONTRIBUTING`, `UI_GLOSSARY`, `UI_REVIEW`, `UX_FINDINGS`, `RUNBOOKS/` | docs tree | Slice 0/1 (written as work lands) |
| 10 | Tests missing: Playwright, contract, frontend, Storybook, `verify/selftest`, only 3 API test classes | test tree | Slice 0 (verifier), Slice 1 (Playwright/Storybook), each slice (API tests) |
| 11 | Web deps minimal: no i18n, runtime validation, forms, charts, icons, test libs | `apps/web/package.json` | Slice 1 |
| 12 | Build output tracked/unignored: `services/api/build`, `apps/web/dist`, `tsconfig.tsbuildinfo`, `__pycache__` | tree + no `.gitignore` | Slice 0 repair |
| 13 | CI only builds; no lint/types/unit/contract/Playwright/verify jobs | single basic `ci.yml` | Slice 0 repair |

## Effort legend
S = small, M = medium, L = large. Effort is recorded per slice in `docs/PROGRESS.md`.
