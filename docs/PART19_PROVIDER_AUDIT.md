# PART19 — External provider audit (PROMPT 011, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 011 external provider (prestataire / association / club externe).  
**Status:** Evidence-based baseline.

## Role key confirmation

- BFF/API role `provider` maps to display role `teacher`. Provider experience delivered as a scoped page `/app/provider` under the teacher shell, with the access gate (contract + documents + assignment + time window) enforced in the UI and (planned) on the server.

## What exists today

- Demo account "Club Échecs Paris" (provider).
- Activities catalogue with enrolment; no provider org model, documents, gate, window-scoped roster, invoices.
- No onboarding, intervenant management, compliance, performance feedback, offboarding.

## Defects

P-D1 No provider UI. P-D2 No org/user model. P-D3 No documents/gate. P-D4 No window-scoped roster. P-D5 No invoices. P-D6 No messages/rules. P-D7 No performance/offboarding. P-D8 No backend/migration.

## Plan

P0 audit → P1 org/user + documents + gate → P2 P1–P8 → P3 P9–P15 → P4 tests/verify/docs.
