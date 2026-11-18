# PART17 — Platform operator audit (PROMPT 009, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 009 operator (SaaS operations across schools).  
**Status:** Evidence-based baseline.

## What operator can see today

- Platform pages: system status, feature flags, integrations, models, support (Platform.tsx). Permission `platform.admin`.
- Nav: tenants (soon), auth events, feature flags, system status, plans (soon).
- No tenant provisioning, lifecycle, support sessions, security ops, compliance center, platform billing, templates, imports, backups, staff management, audit log, announcements.
- No cross-plane isolation tests beyond access tests for /app/platform/flags.

## Cross-tenant read paths to verify

- Operator tokens accepted by tenant endpoints? Need test.
- DB role permissions? Need verify.
- Support session masking? Not implemented.
- Audit log tenant-visible? Not implemented.

## Plan

P0 audit → P1 platform plane separation + roles + WebAuthn + audit → P2 O1–O5 → P3 O6–O10 → P4 O11–O16 → P5 tests/verify/docs.
