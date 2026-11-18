# PART21 — Therapist audit (PROMPT 013, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 013 therapist / external care practitioner (flagged OFF).  
**Status:** Evidence-based baseline.

## What therapist demo account can see today

- Demo account "Claire Aubry" (therapist) maps to display role `safeguarding-lead` (per roles.ts: therapist -> safeguarding-lead). Landing /safeguarding. No dedicated therapist page exists. No clinical or health data stored in SchoolOS schema beyond none.

## Health-like fields hunt

- No health/adaptation/medical fields in V1–V13 migrations. `health` module is soon-only. No diagnosis, clinical notes, assessments, treatment plans, or health documents anywhere. Good baseline.

## Plan

P0 audit → P1 flag + access model + gate → P2 T1–T5 → P3 T6–T10 → P4 tests/verify/docs. Flag stays OFF.
