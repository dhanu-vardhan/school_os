# PART16 — Reception / front office report (PROMPT 008)

**Date:** 2026-11-18  
**Status:** P0–P4 web + migration + docs complete; backend Java integration partial. Not production-ready.

## R1–R16 status

| ID | Capability | Status |
|---|---|---|
| R1 | Dashboard | Implemented (web) |
| R2 | Visitor register | Implemented (web) |
| R3 | Late arrivals | Implemented (web) |
| R4 | Early departures | Implemented (web) |
| R5 | Absence call intake | Implemented (web) |
| R6 | Family requests queue | Implemented (web) |
| R7 | Enrolment intake | Implemented (web) |
| R8 | Appointments desk | Implemented (web) |
| R9 | Certificates | Partial (UI) |
| R10 | Mail/parcels/lost&found/rooms/keys | Implemented (web) |
| R11 | Emergency lists & alerts | Implemented (web) |
| R12 | Directory | Implemented (web) |
| R13 | Announcements drafting | Partial (link) |
| R14 | Kiosk mode | Partial (intent) |
| R15 | Shift handover notes | Implemented (web) |
| R16 | Reports | Partial (UI) |

## Verification

- Web typecheck PASS, 165 tests PASS, build PASS.
- Migration V9 creates 16 reception tables with forced RLS.

## Residual risks / blockers

- Java backend has no reception controller/service.
- 403 matrix not automated; kiosk/offline packet not implemented.
- Legal/DPO items remain human tasks.
