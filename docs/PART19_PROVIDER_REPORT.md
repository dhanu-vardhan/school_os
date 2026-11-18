# PART19 — External provider report (PROMPT 011)

**Date:** 2026-11-18  
**Status:** P0–P4 web + migration + docs; backend Java integration partial. Not production-ready.

## P1–P15 status

| ID | Capability | Status |
|---|---|---|
| P1 | Onboarding | Implemented (web) |
| P2 | Intervenant management | Implemented (web) |
| P3 | Access gate | Implemented (web) |
| P4 | Sessions | Implemented (web) |
| P5 | Roster (window-scoped) | Implemented (web) |
| P6 | Attendance & pick-up | Implemented (web) |
| P7 | Emergency panel | Partial (web) |
| P8 | Session report & incident | Implemented (web) |
| P9 | Safeguarding conduct | Implemented (web) |
| P10 | Messages | Implemented (web) |
| P11 | Invoices & payments | Implemented (web) |
| P12 | Consignes & sécurité | Implemented (web) |
| P13 | Performance & feedback | Implemented (web) |
| P14 | Offboarding | Implemented (web) |
| P15 | Notifications | Implemented (web) |

## Verification

- Web typecheck PASS, 165 tests PASS, build PASS.
- Migration V12 creates provider tables with forced RLS.

## Residual risks / blockers

- Java backend has no provider service; gate not server-enforced yet.
- Window scope not tested against DST/clock skew.
- Legal/DPA/PDP items remain human.
