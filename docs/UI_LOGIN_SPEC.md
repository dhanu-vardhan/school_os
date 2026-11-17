# UI_LOGIN_SPEC — pixel-faithful login (Acadia concept)

Status: implemented (Part 6). Reference asset `docs/design/login-reference.png` is **missing** in this checkout; this spec is derived from the written brief and used as the implementation contract. Please add the mockup image; screenshots of the implementation are stored under `docs/design/screens/`.

## 1. Palette (navy / royal blue)
- Brand deep (navy): `#0B1B3F` (`--brand-950`) — gradient start, headings, sidebar.
- Brand (royal blue): `#3A5BC7` (`--brand-600`) — primary buttons, active states, links.
- Accent (sky): `#6EA8FF` (`--accent-400`) — icons on dark, highlights, chart secondary.
- App background: `#F5F8FC` (`--app-bg`); surface white; borders `#D5DDEA` (`--border`).
- Text: primary `#0F1B3A`, secondary `#51607A`, placeholder `#7C8AA3` (adjusted to `#5A6982`-ish for contrast).
- Dark mode: app `#0A1226`, surface `#111B33`, borders low-contrast navy, royal blue lightened.

## 2. Layout (desktop >= 1024 px)
- Split screen grid `55% / 45%`, `min-height: 100dvh`.
- Left brand panel: vertical gradient navy (top-left) -> royal blue (bottom-right), line-art network + low-opacity icons (8-14%), content vertically centred, left padding ~12%.
  - Logo lockup: BrandMark SVG + wordmark "Acadia" (~40 px bold white) + caption "School Management Platform".
  - Headline (white, 56 px, bold, 2 lines): "One Platform. Every School Connection."
  - Description (light blue-white, ~20 px, max-width 34 rem).
  - Four benefit rows with sky-blue icons.
  - Entrance animation fade + 12 px rise, stagger 60 ms; reduced-motion safe; background lines slow drift.
- Right form panel: light blue-grey bg, white card ~540 px, radius 24 px, shadow, padding 48 px, vertically centred.
  - "Welcome back!" (bold navy, ~32 px), "Sign in to access your school workspace."
  - School ID/Code field (school-building icon), Email/Username (mail icon), Password (lock icon + Show/Hide toggle).
  - Remember me (left) / Forgot password? (right).
  - Sign In button: full width, pill, royal blue, 56 px.
  - Help & Support link centred.
  - Footer: language switcher, theme toggle, Terms, Privacy, version; trust line "Protected sign-in".

## 3. Responsive
- Tablet 640-1023: brand panel compact top banner, card centred below.
- Mobile <640: navy gradient header ~32% height, card overlaps header edge (negative margin), inputs 56 px, button pinned above keyboard (100dvh + safe-area). Benefits hidden.

## 4. Behaviour
- School code resolution chip (rate-limited public endpoint), tenant branding accent, remember last school (localStorage try/catch).
- Generic error message on failure (no account existence leak).
- Passkey button when available; MFA/reset/invitation/locked/expired/step-up reuse shell.
- Loading spinner keeps width; error shake + aria-live + focus first invalid; offline banner; caps-lock hint; paste allowed; correct autocomplete.
- Demo mode: "Try the demo" outline button below Help & Support only when DEMO_MODE=true + DEMO ribbon; production builds exclude demo picker code path.

## 5. Acceptance
- Playwright screenshot regions within tolerance; Lighthouse perf >=95, a11y >=95, best-practices >=95; LCP <1.8 s mobile; contrast white-on-gradient >=4.5; keyboard-only login; screen-reader order logo, heading, form, links.
- Deviations: placeholder text colour darkened from #7C8AA3 to ~#5A6982 to pass 4.5:1; sky accent reused for info scale.