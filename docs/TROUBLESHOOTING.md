# Troubleshooting

## 2026-11-16: HTTP 401 and unstyled preview

### Diagnosis (preview http://localhost:3000)
| Resource | Status | Notes |
|---|---:|---|
| `GET /` (HTML document) | 200 | Vite dev server, OK |
| JS bundle `/src/main.tsx` | 200 | Served by Vite module graph |
| CSS (`index.css` via module) | 200 | Loaded through Vite |
| Mock service worker | N/A | Not used; preview is self-contained in-app mock |
| `/api/*` | 401 | Real API requires Bearer JWT (expected). **No `/api` calls from preview UI** |
| `/auth/*` | N/A | No auth routes in preview |

### Root causes
1. **401 (observed when proxied/hitting API):** `/api` is protected by Spring Security OAuth2 resource server and returns `401` without JWT. The preview UI must never call `/api`; earlier "page not working 401" was caused by requests falling through to protected backend in certain proxy/gateway setups. Fix: preview boot is self-contained with in-memory seeded data and fake session per role; no network/API dependency.
2. **Unstyled/plain text:** no Tailwind/PostCSS config and no global CSS imported (`main.tsx` missing `index.css`, no `tailwind.config.js`, no `postcss.config.js`, no `src/index.css`). Screens also rendered placeholder strings. Fix: added Tailwind + PostCSS + tokenized `index.css`, imported in entry, and replaced placeholders with real `packages/ui`-style components/screens (director Classes reference).

### Fixes applied
- `apps/web/vite.config.ts`: `server.host = '0.0.0.0'`, port 3000.
- `apps/web/tailwind.config.js`, `postcss.config.js`, `src/index.css` (tokens).
- `apps/web/src/main.tsx`: imports global CSS.
- `apps/web/src/App.tsx`: preview boot (loading/ready/error), mock seeded data, no `/api` calls, luxury shell, director Classes screen.

### Health checks
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/actuator/health
- DB: `PGPASSWORD=schoolos_app psql -h localhost -p 5432 -U schoolos_app -d schoolos -c "SELECT 1"`
