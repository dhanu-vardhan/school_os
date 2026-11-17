# BENCHMARK_PATTERNS — interaction patterns studied for SchoolOS Part 2

**Date:** 2026-11-17  
**Scope:** Part 2 of the frontend master prompt (actions, motion, perceived speed).  
**Rule of engagement:** we borrow *behavioural principles only*. No competitor branding, colours, icons, fonts, copy, screenshots or assets are copied. SchoolOS keeps its indigo/violet + emerald identity and its own wording in FR/EN.

This document is the "why" behind the components and rules implemented in phases 2–9. The measured before/after evidence lives in `docs/UI_AUDIT_PART2.md` and `docs/UI_REPORT_PART2.md`.

---

## 1. Patterns reviewed

| Pattern (generic name) | Where it is common | Principle we adopt | Where it lands in SchoolOS |
|---|---|---|---|
| **Contextual row actions** | Linear, Notion | Keep the table calm: reveal secondary actions on hover/focus for pointer users, keep them permanently available on touch. | `DataTable` row actions + `RowActions` primitive |
| **Command palette** | Linear, Raycast, VS Code | One keyboard entry point for pages, records and actions; recent items first; fuzzy, accent-tolerant matching. | Upgraded `CommandPalette`, `Ctrl/Cmd+K`, `?` shortcut help |
| **Quick-add menu** | Google Workspace, Notion | A single role-aware creation entry in the top bar, mirrored in the palette. | `QuickAddMenu`, `N` shortcut |
| **Floating action button / speed dial** | Google Classroom, Material | On small screens the primary create action lives in the thumb zone; on desktop it stays in the page header. | `Fab`, `SpeedDial` |
| **Undo-first snackbars** | Gmail, Material | Reversible operations execute immediately and offer *Undo* for a short window; no interruptive confirmation. | Sonner toasts with 8 s undo |
| **Bulk action bar** | Gmail, Linear | Selection reveals a transient bottom bar with count and a small set of safe actions + clear selection. | `BulkActionBar` |
| **Sticky form footer** | Linear, Stripe | Long forms keep Save/Cancel reachable, show unsaved state, and respect mobile safe areas. | `StickyActionBar` |
| **Segmented view switch** | Apple, Linear | Instant switching between equivalent representations (list/grid/calendar; day/week/month) with roving tabindex. | `SegmentedControl`, `ButtonGroup` |
| **Split action** | GitHub, Notion | One obvious primary action plus a dropdown of closely related variants; avoid a row of competing buttons. | `SplitButton` |
| **Optimistic UI** | Linear, Slack | Local state updates instantly; failures roll back with a clear message and retry. | TanStack Query mutations in `AppProviders` |
| **Skeleton parity** | Facebook, GitHub | Loading placeholders mirror the real layout so CLS stays near zero. | `SkeletonList` + screen-level skeletons |
| **View Transitions** | Chrome, many SPAs | Navigate with a short cross-fade; degrade gracefully to CSS animation. | `useViewTransition` in the shell |
| **Swipe actions / pull-to-refresh** | Gmail, iOS mail | Touch-only shortcuts never replace visible actions; long-press opens a context menu. | `useSwipeActions`, `useLongPress`, haptics adapter |
| **Progressive disclosure** | Google, Apple | Advanced fields collapse under “More options”; wizards only for > 6 fields. | Forms and `PageHeader` patterns |
| **Inline edit** | Notion, Airtable | Click to edit, Enter to save, Esc to cancel, autosave indicator. | Table cells and profile fields |
| **First-run checklist / tours** | Notion, Slack | Dismissible, role-specific onboarding that never repeats. | `OnboardingChecklist` (preference-backed) |

---

## 2. Decisions taken from the patterns

1. **One primary per section.** Segmented controls and menus absorb choice; they never become a second filled button. This is enforced by a source lint (`scripts/lint-actions.mjs`) and documented in `docs/DESIGN_TOKENS.md`.
2. **Verb + object labels.** “Add student”, not “Submit”; “Send announcement”, not “OK”. Localised in both locales; FR strings are allowed +30% width without wrapping because buttons size to content and never truncate labels.
3. **Undo before confirm.** Only irreversible operations (data erasure, permanent deletion) get typed confirmation. Everyday archive/send/approve actions execute and offer Undo.
4. **Motion is a token, not a one-off.** Enter 200–250 ms, exit 150 ms, press 80 ms, state layer 120 ms; only `transform`/`opacity` animate; everything collapses under `prefers-reduced-motion` or the in-app reduce-motion preference.
5. **Touch gets its own affordances.** Hover-only features always have a tap equivalent: kebab always visible on touch, swipe actions paired with visible buttons, bottom sheets instead of centred modals.
6. **Speed is measured, not claimed.** Click depths for the seven top tasks and CLS are recorded before and after in `docs/UI_AUDIT_PART2.md` / `docs/UI_REPORT_PART2.md`.

---

## 3. Anti-patterns explicitly rejected

- Multiple filled buttons in one header (“New”, “Export”, “Save” all primary).
- Confirmation dialogs for reversible actions.
- Labels that only make sense in English or overflow at +30% in French.
- Hover-only controls with no touch/focus equivalent.
- Animating width, height, top/left or box-shadow in lists (layout thrash).
- Toast messages containing case details, student names or school identifiers.
- Competitor-looking colour ramps, icon sets or typefaces.
