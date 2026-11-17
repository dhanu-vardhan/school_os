# DESIGN_TOKENS — SchoolOS colour, motion and action language

**Status:** authoritative for frontend Part 2.  
**Source of truth:** `packages/ui/src/styles.css` (CSS custom properties) and `packages/ui/src/tailwind-preset.js` (Tailwind 3 mirror).  
**History:** replaces the ivory/gold palette (decision F4); indigo/violet + emerald is the original SchoolOS identity.

---

## 1. Token architecture

Tokens are layered. Components never reference a primitive directly; they consume semantic or component tokens. This keeps dark mode, high contrast and future rebrands to a single layer.

```
primitives  →  semantic  →  component
(--brand-600)  (--action-primary-bg)  (.ui-btn-primary)
```

| Layer | Defined in | Example | Rule |
|---|---|---|---|
| **Primitive** | `styles.css :root` | `--brand-600: 79 70 229`, `--accent-500`, `--neutral-0…950` | Raw colour values exist *only* here (and in generated shadow tokens). Stored as RGB channel triplets so Tailwind `/opacity` works. |
| **Semantic** | `styles.css :root` + `.dark` + `html.ui-high-contrast` | `--app-bg`, `--surface`, `--surface-2/3`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-subtle`, `--role-*`, `--overlay`, `--grid-line` | Dark/high-contrast swap this layer only. |
| **Component** | `styles.css` component blocks + `lib/variants.ts` | `--action-primary-bg`, `--action-primary-fg`, `--state-layer-hover`, `--focus-ring`, `--btn-radius`, `--ripple-color` | Components reference these; variant classes never contain literals. |

### Primitive scales

- `brand` 50–950 — indigo/violet, primary actions and focus.
- `accent` 50–950 — emerald/teal, success and growth.
- `warning` 50–950 — amber.
- `danger` 50–950 — rose, safeguarding and destructive actions.
- `info` 50–950 — sky.
- `neutral` 0–950 — slate, text and surfaces.

### Semantic roles

| Token | Light use | Dark use |
|---|---|---|
| `--app-bg` | page canvas | deep navy canvas |
| `--surface` / `--surface-2` / `--surface-3` | cards, striped rows, hover | elevated navy steps |
| `--border` / `--border-strong` | dividers / controls | lighter slate |
| `--text` / `--text-muted` / `--text-subtle` | primary / secondary / tertiary copy | high-contrast inversions |
| `--text-inverse` | copy on filled actions | copy on filled actions |
| `--role-*` | one accent per product role | brightened for dark backgrounds |

High contrast hardens borders and text, not brand hues, so status meaning is preserved.

---

## 2. Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | enter / standard transitions |
| `--ease-spring` | `cubic-bezier(0.2, 0.9, 0.25, 1.15)` | drawers and bottom sheets only |
| `--duration-press` | `80ms` | press feedback (scale) |
| `--duration-state` | `120ms` | state-layer hover/focus wash |
| `--duration-exit` | `150ms` | overlays leaving |
| `--duration-base` | `200ms` | route fade / enter minimum |
| `--duration-enter` | `250ms` | route fade / enter maximum |
| `--duration-toast-undo` | `8000ms` | undo window for reversible actions |

Rules:

- Animate **only** `transform` and `opacity` in lists and route transitions. No `width`, `height`, `top`, `left` or `box-shadow` animations in repeated elements.
- Charts draw in once on first view; KPI numbers count up once.
- Everything is disabled by `@media (prefers-reduced-motion: reduce)` **and** the in-app `html.ui-reduce-motion` preference.
- State-layer transitions are 120 ms; press feedback 80 ms; the optional mobile ripple is 220 ms and never rendered on pointer-fine devices or under reduced motion.

---

## 3. Action hierarchy (enforced)

1. **Exactly one primary action per view/section.** Other actions are `outline` or `ghost`; related choices go in a `SplitButton` or `DropdownMenu`.
2. **Order:** primary on the right in dialogs/forms on desktop; full-width stacked with primary first on mobile.
3. **Labels are verb + object** — “Add student” / “Ajouter un élève”, “Send announcement” / “Envoyer une annonce”. Never “OK”, “Submit”, “Yes”. French copy is checked at +30% width.
4. **Destructive actions:**
   - Reversible → execute immediately + non-blocking toast “Student archived. Undo” (8 s). No confirmation dialog.
   - Irreversible (erasure/permanent delete) → typed confirmation dialog naming the object.
5. **Disabled states say why** via tooltip/helper text, or the control is hidden when the user lacks permission. A mysterious grey button is a defect.
6. **AI actions** use the `ai` variant and label “Suggest with AI” / “Suggérer avec l’IA”; results always land in a review card with accept/edit/reject and are never auto-applied.
7. **Touch targets** are ≥ 44 px; visible focus ring is mandatory; focus order follows visual order.

### Source lint

`pnpm lint` runs three gates:

- `scripts/lint-actions.mjs` fails on the generic labels `OK`, `Submit` and `Yes` in feature screens (the UI kit and tests are exempt).
- `scripts/lint-colors.mjs` fails on raw hex/rgb/hsl/oklch values and named `white`/`black`/`transparent` outside token files.
- `scripts/check-contrast.mjs` checks 14 token pairs in light, dark, high contrast and dark high contrast.

The one-primary rule and verb+object labels are enforced by review and the shared action primitives; complex cases are documented rather than suppressed by overly clever regex.

---

## 4. Component token map

| Component | Semantic tokens used |
|---|---|
| Button / IconButton | `--action-*`, `--state-layer-*`, `--focus-ring`, `--btn-radius`, `--ripple-color` |
| ButtonGroup / SegmentedControl | Button tokens plus `--control-border` between joined controls |
| DropdownMenu / RowActions | `--surface`, `--border`, `--control-border` (shortcut key), `--status-danger-*` |
| BulkActionBar / StickyActionBar | `--surface`, `--control-border`, `--shadow-md` |
| Fab / SpeedDial | `--action-primary-*`, `--radius-full`, `--shadow-lg` |
| CopyButton / ShareMenu / QuickAddMenu | Button tokens plus `--status-success-*` / `--status-danger-*` |
| Badge / StatusPill | `--status-{brand,success,warning,danger,info}-{fg,bg,border}` |
| Card / surfaces | `--surface`, `--border`, `--shadow-*` |
| Inputs | `--surface`, `--control-border` (≥3:1), `--text`, `--focus-ring` |
| Charts | `--chart-{fill,line,grid,point,label,bar-start,bar-end}` |

Colour-blind safety: every status is encoded by **text + shape/icon + colour**, never colour alone. `/ui-kit/colors` renders the full matrix in light, dark and high-contrast modes with computed contrast ratios; `/ui-kit/buttons` renders every action state and composite primitive, including roving-tabindex keyboard behaviour.
