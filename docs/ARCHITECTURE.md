# Architecture

See continuation prompt. Summary: React+TS frontend (PWA + later Tauri) -> BFF (Spring Boot, cookies) -> API (Spring Boot JWT resource server) -> Postgres (RLS) + S3. Keycloak single realm + Organizations. Modular monolith via Spring Modulith.

## Tenant request flow
1. Authenticate JWT (signature/issuer/audience/expiry).
2. Resolve tenant: filter reads `school_id` from JWT, validates membership, sets `TenantContext`.
3. Bind DB: transaction first statement `SELECT set_config('app.current_school', :schoolId, true)`.
4. Enforce: RLS policies on every tenant table.

## DB roles
- schoolos_owner: schema owner, Flyway only.
- schoolos_app: runtime, no BYPASSRLS, no DDL.
- schoolos_support: break-glass, audited.

## Object storage
Key layout `schools/{school_id}/{module}/{entity_id}/{uuid}.{ext}`. Private buckets, pre-signed URLs only after permission check. Quarantine + ClamAV scan on upload.
