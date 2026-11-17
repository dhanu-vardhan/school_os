# UI_AUDIT_PART2 — baseline audit for the Part 2 action/motion/speed pass

**Date:** 2026-11-17  
**Method:** static source inventory of `apps/web/src`, `packages/ui/src`, `packages/i18n/src`, docs and verifier, plus a live check that web (`:3000`), BFF (`:8085`) and API (`:8080`) were reachable. No code was changed during the audit.  
**Companion docs:** `docs/BENCHMARK_PATTERNS.md` (principles), `docs/DESIGN_TOKENS.md` (token/action rules), `docs/UI_REPORT_PART2.md` (final before/after).

---

## 1. Baseline snapshot

| Area | Baseline (2026-11-17, before Part 2) |
|---|---|
| Screens / routes | 47 route entries, 44 lazy imports, 15 page modules (`docs/UI_PLAN.md` A1–U2/E1) |
| Design tokens | 6 primitive palettes (50–950), 14 semantic tokens, 7 role accents, 6 radii, 6 shadows, 3 motion tokens — all in `packages/ui/src/styles.css` + Tailwind preset |
| Raw colours outside token files | **1 hex** (`styles.css:286`, print border), **12 lines / 15 literal `rgb()`** (all shadow-token declarations), ~30 named `white` / `black` / `transparent` utility usages in TSX |
| Shared `Button` | 1 component, 7 variants, 5 sizes, `asChild` via Radix Slot, `loading` spinner, `aria-busy`; no `ai` variant, no ripple, no shortcut metadata |
| Composite actions | `DropdownMenu`, `Modal`, `Drawer`, `ConfirmDialog`, `Tabs`, `Switch`, `Tooltip`; **no** ButtonGroup, SegmentedControl, SplitButton, standalone BulkActionBar, StickyActionBar, FAB/SpeedDial, CopyButton, Share/Export menu, QuickAddMenu |
| Action markup in web | 55 `<Button>`, 10 `<IconButton>`, 18 `asChild`, 9 raw `<button>`, 3 raw `<a>`, 17 `<Link>`, 45 `onClick` lines, 0 `role="button"` |
| Primary-per-section violations | Activity detail (2 filled CTAs in one view), AI suggestion grid (one strong Accept per card), UiKit (intentional); Announcements header + modal are separate sections |
| Generic labels | `common.save`, `common.submit`, `common.confirm`, `common.create` used as bare verbs; no `OK` literal; no verb+object rule enforced |
| Keyboard | Only `Ctrl/Cmd+K` palette toggle; no `?`, `G then S`, `N`, `/`, `Ctrl/Cmd+Enter`, `Ctrl/Cmd+S`; shortcuts never gated on input focus (only one exists) |
| Command palette | Nav items only; no records, actions, settings, recent items or fuzzy/accent matching; hardcoded English strings |
| Row actions / bulk | DataTable has selection + inline bulk bar but **no page passes `bulkActions`**; no per-row action menus; cards clickable via `<tr onClick>` / `<div onClick>` |
| Motion | `active:scale-[0.98]`, `transition-all duration-fast`, shimmer/page-in/scale-in; no duration/curve tokens for enter/exit/press/state/ripple; framer-motion installed but unused |
| Perceived performance | No prefetch, no `placeholderData`, no View Transitions, generic 5-row skeleton for every screen; QueryClient `staleTime: 30s`, `retry: 1`; 575 kB main chunk |
| Persistence / saved views | Locale + a11y prefs in localStorage (safe); table sort/filter/columns/density are local state only, lost on navigation |
| Inline edit / unsaved guard | None; wizards/modals only; steppers allow skipping steps and silently discarding input |
| Toasts / undo | Sonner mounted; 24 `toast.*` calls, all informational; **no `toast.action` / undo anywhere**; `ConfirmDialog` exists but unused |
| AI affordances | `ai` variant missing; `AiSuggestionCard` has hardcoded English copy despite i18n keys; review card semantics exist (accept/edit/reject) |
| Touch | No swipe, no long-press, no haptics adapter usage, no FAB; 32 px `icon-sm` controls in the shell (WCAG 2.5.8 minimum is 24 px; our target is 44 px) |
| A11y | Skip link, Radix focus traps for dialogs, `role=status`/`role=alert`, reduced-motion/high-contrast/large-text preferences; mobile sidebar is not a trap; no error boundaries; no roving tabindex utility |
| Verification | `verify-all.sh` PASS 14/14 with stack up; Vitest 22/22; Playwright 9 pass / 1 skipped; no lint script; CI runs only `pnpm --filter web build` |

---

## 2. Click-depth baseline for the seven top tasks

Depth counts **clicks from an authenticated dashboard to the screen/form where the task starts**. Typing, date picking and final Save are excluded, so these are comparable before/after UI-navigation measurements.

| Task | Baseline path | Clicks | Notes |
|---|---|---:|---|
| Take attendance | — | **n/a** | No attendance screen/route exists in the current app (only timetable mocks). A minimal mock screen will be added in phase 8. |
| Add a student | Dashboard → Students → *Nouvel élève* | **2** | 4-step wizard; final save is a 3rd interaction. |
| Enrol in an activity | Dashboard → Activities → activity card → *Inscrire* | **3** | 3-step enrolment wizard. |
| Log a concern | Dashboard → Safeguarding → *Nouveau signalement* | **2** | Restricted roles only. |
| Approve an AI suggestion | Dashboard → AI suggestions → *Accept* | **2** | Accept is already one click on the card. |
| Message a parent | Dashboard → Messages → conversation → *Envoyer* | **3** | Reply box is present on the detail pane. |
| View today's timetable | Teacher/Student dashboard (already visible) | **0–1** | Director/parent have no timetable view; dashboard quick action needed for all roles. |

Target after the reduce-clicks pass: **≤ 3 for every task with a screen**, and attendance/timetable get a reachable screen.

---

## 3. Gap register (drives the build order)

| ID | Gap | Phase |
|---|---|---|
| G-A1 | No action-component primitives for group/split/bulk/sticky/FAB/copy/quick-add | 4 |
| G-A2 | 9 raw `<button>` + 3 raw `<a>` outside the shared system; bare generic labels | 5 |
| G-A3 | Only one keyboard shortcut; palette is nav-only and English | 6 |
| G-A4 | No row actions, swipe, long-press or haptics; bulk bar unused | 6 |
| G-C1 | Raw colour literals (print hex, literal shadow `rgb()`, named whites/blacks) and no component-token layer | 2–3 |
| G-C2 | No contrast test, raw-colour lint, colour-blind review page | 2 |
| G-M1 | No enter/exit/press/state/ripple motion tokens or View Transitions | 7 |
| G-M2 | Generic skeletons, no prefetch, no `placeholderData`, no optimistic coverage for most toggles | 7 |
| G-E1 | No saved views, inline edit, smart defaults or unsaved-changes guard | 8 |
| G-E2 | Attendance/timetable top tasks not reachable | 8 |
| G-T1 | No offline attendance queue, bottom sheets, 360 px pass, haptics adapter wiring | 9 |
| G-Q1 | No lint script, no error boundaries, stale docs, verifier registry lacks Part 2 features | 10 |

---

## 4. Measurement plan for "after"

- **Clicks:** replay the seven paths with Playwright and assert `clickCount <= 3`; record results in `docs/UI_REPORT_PART2.md`.
- **CLS:** `PerformanceObserver` for `layout-shift` entries on dashboard, students list and timetable in the Playwright smoke suite; target `< 0.05`.
- **Lighthouse:** run `lighthouse` via `npx` against the dev/preview URL if available in the environment; if the tool cannot be installed offline, record the exact command and mark the metric as *not measured* rather than inventing a score.
- **Contrast:** scripted WCAG ratio check for semantic foreground/background pairs in light, dark and high-contrast; target ≥ 4.5:1 for body text and ≥ 3:1 for large text/UI boundaries.
- **Raw colours:** `pnpm lint` must report zero violations outside token files.
- **Build gates:** `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `./scripts/verify-all.sh`.
