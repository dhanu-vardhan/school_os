# PART16 — Reception / front office audit (PROMPT 008, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 008 reception (secrétariat d'accueil, loge).  
**Status:** Evidence-based baseline.

## Role key confirmation

- Display role: `receptionist` (BFF `reception`, demo account "Emma Rivière"/"Hugo Leroy"). Canonical landing currently `/front-office`. Prompt asks `/reception`; both will be supported.

## What exists today

- No reception page (only `/app/front-office` SoonPage). Nav for receptionist has visitors (soon-ish) and directory.
- Permissions: `visitors.manage`, `pickups.approve`, `attendance.board` exist partially.
- Dashboards: reception dashboard hints (`dash.receptionVisitorsHint`).
- No visitor register, movement, absence calls, family requests, enrolment intake, appointments, certificates, mail/lost&found, rooms/keys, emergency rolls, directory, announcements drafting, kiosk, handover.

## Defects

R-D1 No front-desk UI. R-D2 No visitor log/badging. R-D3 No late/early movement with collector verification/restrictions. R-D4 No absence call intake. R-D5 No family requests queue. R-D6 No enrolment intake. R-D7 No appointments desk. R-D8 No certificates. R-D9 No mail/parcels/lost&found/rooms/keys. R-D10 No emergency rolls/alerts. R-D11 No directory. R-D12 No announcements drafting. R-D13 No kiosk. R-D14 No handover notes. R-D15 No reports. R-D16 No 403 matrix tests. R-D17 No backend/migration.

## Plan

P0 audit → P1 permissions + minimal pupil view + audit → P2 R1–R8 → P3 R9–R16 → P4 tests/verify/docs.
