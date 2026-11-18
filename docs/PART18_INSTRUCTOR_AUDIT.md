# PART18 — Instructor audit (PROMPT 010, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 010 instructor (animateur / intervenant interne).  
**Status:** Evidence-based baseline.

## Role key confirmation

- BFF/API role `instructor` maps to display role `teacher` (no dedicated canonical role). Instructor experience is delivered as a scoped page under the teacher shell (`/app/instructor`), with eligibility gate and activity-scoped data.

## What exists today

- Activities module: entities `Activity`, `ActivityOffering`; mock catalogue; enrolment.
- No instructor dashboard, sessions, attendance, pick-up, ratio monitor, incidents, messaging, timesheet, funding exports.
- No eligibility gate (honorability/qualifications/insurance/charter/training).
- No session-scoped emergency contacts.

## Defects

I-D1 No instructor UI. I-D2 No eligibility gate. I-D3 No sessions/roster. I-D4 No attendance. I-D5 No pick-up verification. I-D6 No ratio monitor. I-D7 No session notes. I-D8 No incidents. I-D9 No messaging. I-D10 No waitlist/promotion. I-D11 No trips. I-D12 No hours/documents. I-D13 No funding exports. I-D14 No help procedures. I-D15 No backend/migration.

## Plan

P0 audit → P1 assignment/session scope + gate → P2 I1–I7 → P3 I8–I15 → P4 tests/verify/docs.
