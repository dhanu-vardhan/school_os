# PART21 — Therapist report (PROMPT 013)

**Date:** 2026-11-18  
**Status:** P0–P4 web + migration + docs; backend Java integration partial. Not production-ready. Flag OFF by default.

## T1–T10 status

| ID | Capability | Status |
|---|---|---|
| T1 | Onboarding & conformity | Implemented (web, flag-gated) |
| T2 | Guardian consent flow | Implemented (web) |
| T3 | Assignment & scheduling | Implemented (web) |
| T4 | Session logistics | Implemented (web) |
| T5 | Coordination points (coded) | Implemented (web) |
| T6 | Safeguarding duty | Implemented (web) |
| T7 | Administrative documents | Implemented (web) |
| T8 | Messaging | Implemented (web) |
| T9 | Reports (aggregated) | Implemented (web) |
| T10 | Offboarding | Implemented (web) |

## Verification

- Web typecheck PASS, 165 tests PASS, build PASS.
- Migration V14 creates practitioner tables with forced RLS.

## Residual risks / blockers (must be signed off before enabling)

- Legal/DPO opinion on whether any stored element qualifies as health data and HDS obligations.
- Consent texts, convention template, coded vocabulary validation, PAP/PPS/PAI relationship, professional-secrecy guidance, DPIA, insurance, training.
- Java backend has no practitioner service; flag not server-enforced yet.
