# AGENTS.md — SchoolOS conventions for AI agents

## Stack (authoritative)
- Monorepo: pnpm workspaces (JS) + Gradle Kotlin DSL (Java).
- Frontend: React + TS (strict) + Vite, Tailwind + shadcn/ui, TanStack Query/Router, react-hook-form + Zod, i18next ICU.
- Backend: Java 21 + Spring Boot (modular monolith via Spring Modulith), Spring Security OAuth2 resource server (JWT), JPA + jOOQ, Flyway, JobRunr.
- Identity: Keycloak single realm + Organizations (one org per school).
- DB: PostgreSQL with RLS on every tenant table.
- Storage: S3-compatible (MinIO local), private buckets, pre-signed URLs.
- AI: Spring AI behind `AiProvider` port.

## Non-negotiable rules
1. Never take `school_id` from request body/query/header/subdomain without matching to JWT. The only source is the validated JWT claim `school_id`.
2. No session-level `SET`; tenant binding is transaction-local via `set_config('app.current_school', ..., true)`.
3. Runtime DB role `schoolos_app` is not table owner, no BYPASSRLS, no DDL.
4. RLS enabled + forced on every tenant table; CI catalog check fails build otherwise.
5. No tokens/personal data in localStorage/sessionStorage (PWA uses BFF cookies; Tauri uses OS keychain).
6. No business logic in Tauri Rust or React client; client only calls API.
7. No cross-module repository access; use public API + domain events/outbox.
8. No microservices, Kafka, GraphQL in Phase 1.
9. No third-party trackers/ad SDKs.
10. Object storage never public; pre-signed URLs only.
11. Health/special-needs data field-level encrypted; never logged.
12. Every AI output is a draft requiring human review.
13. Legal text always flagged `TODO(legal-review)`.

## Conventions
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Money: integer cents + currency code. Timestamps: UTC timestamptz, display in school TZ.
- UUIDv7 primary keys. Optimistic locking (`version`) on aggregates.
- Modules: tenancy-identity, people, calendar, attendance, pedagogy, support-plans, care, communication, forms-signatures, billing, admissions, activities-canteen, files, notifications, ai, reporting, audit, compliance.
- Module public API only: interfaces, DTOs, events. Enforce via Spring Modulith + ArchUnit tests in CI.
- DTOs separate from entities; Bean Validation at boundary.
- Idempotency keys on retryable mutating endpoints.
- Cross-tenant security suite runs on every CI build and must pass.

## Commands
- `docker compose -f infra/compose/docker-compose.yml up -d`
- Backend: `cd services/api && ./gradlew test` (needs JAVA_HOME=openjdk@21)
- Frontend: `pnpm install && pnpm -r build`
- Migrations: Flyway auto on startup (dev); prod via CI.
- Seed: `cd services/api && ./gradlew bootRun --args='--spring.profiles.active=seed'` (TBD)

## Environment
- JAVA_HOME=/opt/homebrew/opt/openjdk@21
- Node 26, pnpm 10, Docker 29.
