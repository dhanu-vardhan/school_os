# Phase 0 report

## What works
- Monorepo scaffold (pnpm + Gradle)
- Docker Compose: Postgres, Keycloak, MinIO, Mailpit, ClamAV
- Spring Boot API with tenant filter, tenant-aware datasource, RLS, Flyway
- Entities: School, Membership, Student
- Cross-tenant isolation test passes (service + DB RLS as app role)
- React PWA shell builds
- Docs: AGENTS, DECISIONS, ARCHITECTURE, ROADMAP, COMPLIANCE, README

## Stubbed
- Keycloak realm import (file present, not tested)
- BFF, Tauri, file pipeline, notifications, outbox
- Feature slices beyond school/student

## Next
- Auth integration with Keycloak JWT
- School setup, calendar, attendance slice
