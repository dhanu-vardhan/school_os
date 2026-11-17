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
EOF
