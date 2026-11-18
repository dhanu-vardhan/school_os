# PART20 — Analyst audit (PROMPT 012, P0)

**Date:** 2026-11-18  
**Scope:** PROMPT 012 analyst (data analyst — school & network).  
**Status:** Evidence-based baseline.

## What analyst can currently query

- Analytics module exists: `AnalyticsService`, `AnalyticsSuppression`, `AnalyticsStats`, saved views, async export, refresh jobs, golden.json, metric dictionary docs.
- Web pages: AnalyticsDashboard maybe; routes for analyst mostly soon.
- Permissions: `analytics.export` maybe. No governed query builder, metric registry, differencing guard, network consent, data quality, governance center.

## Re-identification hunt

- Need verify no endpoint returns row-level/identifiable data; suppression applied at every layer; no free-form SQL.
- AnalyticsFactSource may aggregate from base tables; DB role must not read base pupil tables (test).
- Need extend tests for adversarial differencing.

## Plan

P0 audit + re-identification hunt → P1 aggregate-only DB role + registry + suppression hardening → P2 A1–A5 → P3 A6–A12 → P4 tests/verify/docs.
