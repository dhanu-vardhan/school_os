# Phase report — ui-acadia (Part 6)

## Summary
- Tokens regenerated (navy/royal blue, sky accent), contrast passes light/dark/high-contrast/dark-high-contrast.
- Login page rebuilt to split-screen mockup layout with inline SVG brand mark and background illustrations.
- App shell sidebar migrated to deep navy.
- Brand name/tagline made configurable via `packages/shared` brand config (default Acadia).
- All unit tests (45) pass; build passes; lint colors/actions/contrast pass.

## Screenshots
- Not captured (Playwright browser not available in env); store future captures under `docs/design/screens/`.

## Known gaps
- Reference image `docs/design/login-reference.png` missing; please add.
- Role dashboards and inner-page template restyle not yet fully migrated beyond token-driven colour change; dashboard component set (/ui-kit/dashboard) not yet created.
- Lighthouse measurements not run.
- Playwright screenshot comparison not implemented.