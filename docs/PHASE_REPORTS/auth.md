# Part 5 — authentication, demo identities and role dashboards

Status: **implemented baseline**, pending external penetration test, DPO/legal review and a
real Keycloak end-to-end run in a shared environment.
Last updated: 2026-11-17.

Design authority: [`../AUTH_DESIGN.md`](../AUTH_DESIGN.md). Demo account inventory:
[`../DEMO_ACCOUNTS.md`](../DEMO_ACCOUNTS.md). Decisions `A1`–`A14`: [`../DECISIONS.md`](../DECISIONS.md).

---

## What was delivered

### Identity and session boundary

- **Keycloak is the only production IdP.** The browser performs Authorization Code + PKCE
  through the BFF; the BFF is a confidential client. Access and refresh tokens stay
  server-side. The browser receives only an opaque 256-bit session cookie:
  `__Host-schoolos_session; HttpOnly; Secure; SameSite=Lax` on TLS, with a plain-name
  localhost fallback because `__Host-` requires `Secure`.
- Server-side session records (Redis when `REDIS_URL` is set, memory otherwise) with:
  absolute and idle timeouts, privileged shorter idle window, session cap, fingerprint
  change detection, immediate logout/revocation, “sign out everywhere”, and public
  HMAC-derived session ids for revocation without exposing the bearer id.
- Double-submit CSRF (`schoolos_csrf` cookie + `X-CSRF-Token` + session field), strict
  Origin/Referer allow-list, rate limiting with lockout and a response-time floor.
- Security headers: CSP, HSTS, frame denial, MIME sniffing prevention, referrer policy,
  permissions policy, and no-store on authenticated responses.
- Append-only security log with a SHA-256 hash chain; secrets and tokens are stripped before
  storage. Events are exportable as NDJSON.
- MFA: TOTP, backup codes, Keycloak/WebAuthn production path, demo passkey simulation,
  trusted devices ≤30 days, per-role mandatory MFA, and step-up (≤10 min) before sensitive
  actions.
- OIDC and demo sign-in converge on the same session/CSRF/MFA/step-up pipeline.

### API authorisation

- JWT validation: issuer, JWKS, audience, expiry/not-before, asymmetric algorithms, clock
  skew ≤30 s. Demo HS256 is isolated to the `demo` profile.
- Membership row (subject + school + active) is authoritative for role and tenant; claim
  role must match. No `school_id` is accepted from body/query/header/subdomain.
- Deny-by-default `@RequirePermission` / `@PublicEndpoint`, reflection catalog test, and a
  runtime interceptor. Unknown permissions deny.
- Parent/guardian and student row scope via `guardian_child` and `student.user_subject`.
  Staff see the tenant; guardians see linked children; students see their own row.
- Step-up filter for sensitive permissions; health/safeguarding data stays field-encrypted
  and out of logs.
- Demo startup guard refuses production-like configuration.

### Web

- FR/EN login with generated demo password, MFA challenge, “use demo code”, school selector,
  forgot/reset password, invitation acceptance, session-expired, forbidden and 404 pages.
- Account & Security: MFA status/enrolment, session list with revoke, per-account security
  events, security-log export (step-up aware), sign-out-everywhere.
- Security Centre: login/MFA/lockout counts, audit-chain integrity, recent events, audit
  export behind step-up; gated by `security.read`.
- School switcher uses server-side memberships and `POST /auth/switch-school`.
- Existing role dashboards are selected from the authenticated role, not a client
  preference; account/security links are present in navigation and the header.
- Demo/mock ribbons remain visible.

### Tests and checks

| Suite | Command | Result |
|---|---|---|
| BFF (session, CSRF, rotation, timeouts, tenant switch, impersonation, JWT, demo guards, public session ids) | `cd services/bff && npm test` | **43 passed, 0 failed** |
| API (JWT negatives, role matrix, deny-by-default catalog, parent scope, demo guard) | `cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew test` | **39 passed, 0 failed** |
| Web unit/component (auth, dashboards, security pages, localisation, palette, actions) | `pnpm --filter @schoolos/web test` | **45 passed, 0 failed** |
| Web typecheck/build | `pnpm --filter @schoolos/web build` | pass |
| Web E2E (Playwright) | `pnpm --filter @schoolos/web test:e2e` | not run in this environment; see “Deferred” |

The BFF suite covers: opaque cookie attributes, tampered/unknown session rejection, idle and
absolute timeouts, logout and logout-all, privileged session cap, CSRF/Origin, login
rotation, tenant switching, impersonation restrictions, step-up enforcement and failure,
parent session isolation, public-id revocation, demo gating, and production config refusal.
The API suite covers: invalid issuer/audience/expiry/alg, missing membership, role mismatch,
deny-by-default catalog, parent/student scope and demo guard.

---

## Commits

| Scope | Commit |
|---|---|
| BFF, infra, Keycloak realm, docs | `1117e46` |
| API security, guardian scope migration, demo seed, tests | `51a92fa` |
| Web auth/security UI and tests | _this phase_ |

---

## Deferred / honest limitations

1. **No external penetration test yet.** The threat model and controls are documented, but
   this is not evidence of production readiness and the code makes no “unhackable” claim.
2. **No legal/DPO sign-off.** Texts that need it are marked `TODO(legal-review)`.
3. **Argon2id is deferred.** Keycloak 25 uses PBKDF2-SHA512 (210k), 12-character minimum and
   password history 10. Revisit on a Keycloak upgrade.
4. **WebAuthn is standards-shaped but demo-simulated.** ES256/RS256, attestation `none`, and
   a minimal CBOR reader exist; enterprise attestation and real authenticator E2E are not
   covered here.
5. **Real Keycloak E2E was not run** in this environment. The OIDC code path, realm import,
   back-channel logout and browser flow are implemented and unit-tested, but need a shared
   environment run before pilot.
6. **Redis mode is covered by the store interface and compose wiring**, not by a Redis-backed
   integration test in this run; dev/test use the memory store.
7. **Native apps are integration points only.** Tauri/Capacitor token storage is documented,
   not shipped or tested here.
8. **Email delivery is not wired.** Forgot-password and invitation flows are implemented at
   the API/BFF boundary; local demo returns a demo token, production delivery still needs a
   mail provider and templates.
9. **Rich academic data is mock.** PostgreSQL demo seed covers identity/tenancy; academic
   screens are served by the mock adapter and marked `mock:true`.
10. **Playwright E2E and the verify runner need a running stack.** The suite exists and the
    app builds; a full Docker + browser run is the next gate.

## Next gate

1. Run `docker compose -f infra/compose/docker-compose.yml up -d` with the demo profile,
   open the picker, complete MFA for a privileged role, switch school as `parent`, revoke a
   session, run a step-up export, and reset the demo.
2. Run Playwright desktop + mobile against the real BFF/API, then the verify runner groups
   that need live services.
3. Repeat with `SCHOOLOS_PROFILE=local` and Keycloak OIDC, then with a production-like config
   to prove the startup guard refuses demo flags.
4. Schedule the external penetration test and DPO review before any real-school pilot.
