# PART15 — Safeguarding & harassment referent audit (PROMPT 007, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 007 (protection de l'enfance / pHARe) — audit of what exists, leakage channels, defects.  
**Status:** Evidence-based baseline. Not a production-readiness claim.

## 1. What exists today

| Surface | Status | Evidence |
|---|---|---|
| Entity | Partial | SafeguardingConcern JPA entity + safeguarding_concern table (V2) in public schema with RLS. |
| Web page | Partial | apps/web/src/pages/Safeguarding.tsx: list, new wizard, detail. |
| Mock/API | Partial | packages/api-client mock returns synthetic concerns (3 seeds). |
| Nav | Minimal | /app/safeguarding, /app/safeguarding/new, /app/safeguarding/:id. |
| Permissions | Partial | safeguarding.read, safeguarding.write. |
| Dashboards | Counts only | "Nombre uniquement — aucun détail accessible ici." |

## 2. Leakage channels identified

Dashboards (counts only), search/⌘K (exclude), notifications (generic), logs (redact), analytics (suppressed aggregates), AI (never), exports (two-person+watermark), URLs (ids only), emails (none), cache/offline (no cache), seeds (generic text), cross-tenant (RLS), IDOR (access list), director (step-up+grant).

## 3. Defects D1-D20

D1 flat entity/table; no restricted store, encryption, access list, audit, break-glass. D2 no intake fields. D3 no triage/SLA/COI. D4 no chronology. D5 no decision support. D6 no doc generation/transmission. D7 no harassment module. D8 no protective adult/vigilance. D9 no sharing. D10 no break-glass. D11 no aggregated reporting. D12 no contacts/templates/training. D13 no notifications/escalations. D14 no data subject/legal requests. D15 no alternate path. D16 no offline-disable. D17 no leakage tests. D18 no two-person export. D19 no legal hold/retention. D20 no backend controller.

## 4. Plan

P0 audit → P1 restricted store + access list + audit → P2 SG1–SG5 → P3 SG6–SG10 → P4 SG11–SG15 → P5 tests/verify/docs.
