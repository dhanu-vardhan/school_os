# ROLE_UI_MAP — roles, landing routes and navigation (Part 7)

Source of truth for UI access mirroring. Backend remains authoritative.

## Roles and landing routes
| Role (display) | Landing route |
|---|---|
| director, deputy, admin, itadmin, admissions, reception, hr, operator | /app/dashboard |
| teacher, assistant, instructor, librarian, provider | /teacher |
| guardian, guardian2, parent | /parent |
| student | /student |
| safeguarding, therapist | /safeguarding |
| nurse | /health |
| finance, accountant | /finance |
| auditor | /audit |
| operator | /platform |

## Access rules
- Unauthenticated -> /login?returnTo=<safe path> (open-redirect safe: only same-origin relative paths).
- Authenticated without active school and >1 membership -> /schools/select.
- Forbidden deep link -> branded 403 page with "Go to my dashboard" and "Request access".
- Unknown route -> 404 page.
- / and /dashboard redirect to landingRouteFor(user).
- Multi-role users use a context switcher in the user menu; permissions never merge silently.
- Parent child context stored in URL (?child=<id>) validated against linked children; invalid -> fallback + toast.
- 401 -> re-auth flow preserving URL; 403 -> in-place forbidden; 404 -> not found; 429 -> calm banner; 5xx -> retry card with correlation id.

## Cache hygiene
Logout, tenant switch, role switch, 401: clear query cache, in-memory stores, close SSE/WS, reset SW caches, revoke object URLs.

## Backend gaps
All non-student/school endpoints remain mocked via VITE_USE_MOCK; see docs/FRONTEND_WIRING.md.