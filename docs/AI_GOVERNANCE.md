# AI Governance

## Allowed uses
- Voice-to-observation drafting, observation/message drafting, report comment assistance, photo caption suggestions.
- Private translation, message tone check, parent assistant grounded in school documents.
- Director copilot over aggregated metrics, smart import assistant, document understanding, weekly briefing.
- Forecasting and optimisation (activity demand, attendance, billing, enrolment, anomaly detection, timetable/cover optimiser).
- Smart notification digest, in-app support assistant.

## Forbidden uses
- Facial recognition or biometric identification of children.
- Emotion detection.
- Automated grading or ranking of children.
- Predicting individual child performance, behaviour, risk or dropout.
- Automated admission, discipline, exclusion or fee-eligibility decisions.
- AI processing of safeguarding or special-needs records.
- Surveillance of staff productivity.
- Profiling of families.

## Human oversight
Every AI suggestion is stored as ai_suggestion with status proposed/edited/approved/rejected. Approval requires deliberate action. Kill switches at platform, school and user level.

## Data rules
- Safeguarding, special-needs, health records and restricted-person flags never sent to any model by default.
- Redaction pipeline replaces direct identifiers with placeholders before model calls.
- No training on customer data. No cross-tenant embeddings.
- Prompts/outputs not stored unless school enables audit log.

## Analytics layer (Part 8, 2026-11-17)

- **Default is rule-based, not AI.** All shipped insights (`packages/analytics-core/src/insights.ts`)
  are deterministic rules over already-computed aggregates, with severity, evidence, suggested
  action and a “why am I seeing this” explanation. They never decide anything; a human reviews,
  dismisses or snoozes them.
- Optional AI narratives remain **disabled**: `MODEL_REGISTRY.md` pins no model, so there is no
  approved model id/version to call. If enabled later, the input is aggregate-only and redacted,
  the output is labelled “AI-generated, review required”, model id/version and quota are logged,
  and the text is a draft that must be edited before use (AGENTS.md rule 12).
- No individual-pupil prediction, risk score, behaviour label, staff-productivity measure or
  comparative staff ranking is permitted in analytics. “Students to watch” views are supportive,
  rule-based and DPO-gated where they use chronic/composite flags.
- Forecasts are explainable baselines (seasonal naive/exponential smoothing) with prediction
  intervals, backtest error and an “estimate, not fact” warning; they are never projected onto a
  named child.
- Demo analytics use synthetic data and carry `meta.mock=true`; no model is called in demo mode.
