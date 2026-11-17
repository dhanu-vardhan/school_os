# Model registry

No models pinned yet. Spike required (docs/AI_SPIKE.md).

## Analytics narratives (Part 8, 2026-11-17)

- **Status: not approved / not enabled.** No model id, version, licence, checksum or evaluation
  score is pinned, so the governed analytics layer must not call a model for narratives,
  forecasts, insight text or any student-level interpretation.
- Analytics currently shipped uses deterministic rules and explainable statistical baselines
  only (`packages/analytics-core/src/insights.ts`, `forecast.ts`); these are code, not models.
- Before any narrative feature is enabled: pin the model here with task/tier/licence, languages
  tested, evaluation results, approved-for-use flag and checksum; confirm aggregate-only redacted
  inputs, per-school feature flag, quota, human-review label and audit logging
  (`docs/AI_GOVERNANCE.md`).

## Template
- Model id, task, tier, licence, size, quantisation, hardware requirement, languages tested, evaluation scores, approved-for-use flag, checksum.
