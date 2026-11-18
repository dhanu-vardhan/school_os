# SchoolOS Insights — dashboard design specification

Status: Phase 2 design artifact. OpenPencil was not connected when this was authored;
this document is the design source of truth until a canvas design is available.

## Product intent

A premium, data-dense enterprise dashboard for SchoolOS operators and school leaders.
Domain mapping: "customers" are **families**, "revenue" is **tuition and fee revenue**.
All figures are fictional fixtures. AI output is always a **draft requiring human review**
(`AGENTS.md` rule 12).

## Routes (additive, no change to the existing demo)

| Route | Purpose |
| --- | --- |
| `/insights` | Overview: KPIs, revenue trend, activity, AI drafts |
| `/insights/analytics` | Engagement, attendance and retention funnels |
| `/insights/revenue` | Revenue area chart, plan mix, invoices |
| `/insights/customers` | Family insights, segments, cohort table |
| `/insights/ai` | AI recommendation queue with review actions |
| `/insights/settings` | Profile, notification and display preferences |

## Visual system

- Canvas `#F5F6FA`; surface `#FFFFFF`; ink `#111827`; muted `#667085`.
- Sidebar `#0B1220` with `#1D293D` active state; accent indigo `#4F46E5`;
  positive emerald `#059669`; warning amber `#D97706`; danger `#DC2626`.
- Radius 14px cards, 10px controls; border `#E6E8EF`.
- Shadow: `0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.04)`.
- Type: Inter/system sans. 12px eyebrow uppercase, 28–32px page title,
  24–28px KPI value, 14px body, 12px metadata.
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32px.
- Dark-mode ready via CSS custom properties (not enabled by default).
- Motion: 160ms ease transitions; `prefers-reduced-motion` disables them.

## Layout

- Desktop (`>= 1024px`): fixed 248px sidebar, sticky 64px topbar, content
  `max-width: 1440px`, 24px gutter.
- Tablet (`768–1023px`): sidebar collapses to a 72px icon rail.
- Mobile (`< 768px`): sidebar becomes an off-canvas drawer toggled from the
  topbar; single-column content; charts use horizontal scroll containers.

## Component hierarchy

```
DashboardApp (route boundary at /insights/*)
└── DashboardShell
    ├── Sidebar (nav items, active state, org switcher)
    ├── Topbar (search, period selector, notifications, avatar)
    └── PageOutlet
        ├── OverviewPage    → KpiGrid, RevenueChart, ActivityFeed, AiDraftCard
        ├── AnalyticsPage   → ChannelChart, FunnelBars, CohortTable
        ├── RevenuePage     → RevenueChart, PlanMix, InvoiceTable
        ├── CustomersPage   → SegmentCards, FamilyTable, RetentionChart
        ├── AiPage          → AiDraftCard[] with accept/dismiss
        └── SettingsPage    → SettingsForm (profile, notifications, display)
```

Reusable primitives: `Card`, `Badge`, `Button`, `Toggle`, `SectionHeader`,
`EmptyState`, `DataTable`, `StatDelta`, `AiDraftCard`.

## Interaction and states

- Sidebar links use router `NavLink`; active item gets accent rail + tinted fill.
- Period selector switches data series (30d / 90d / 12m) via repository query.
- Search filters the family and invoice tables in-place.
- AI draft actions: **Accept** and **Dismiss** update local queue and emit a
  toast; accepted drafts are marked "Approved by you" with a review timestamp.
- Settings form validates required fields and shows inline errors + save toast.
- Every interactive control has `aria-label`/visible text and a `:focus-visible`
  ring; charts have `role="img"` with an accessible summary.
- No tokens or personal data in browser storage (`AGENTS.md` rule 5).

## Verification (2026-11-18)

- `pnpm --filter @schoolos/web build` — passes. Dashboard is code-split
  (`DashboardApp` chunk ~453 kB); the main chunk dropped from 1.21 MB to 755 kB.
- `pnpm --filter @schoolos/web test` — 121/121 tests pass.
- Playwright (desktop 1440x900, mobile 390x844):
  - all six routes render with the correct heading and active nav item;
  - period selector, search filter, AI approval, form validation/save work;
  - mobile drawer opens, navigates and closes; no horizontal overflow
    (`scrollWidth === clientWidth`);
  - **0 browser errors** (only pre-existing React Router v7 future-flag warnings).
- OpenPencil remained disconnected throughout; no canvas design was produced.
