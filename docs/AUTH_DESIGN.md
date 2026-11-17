# Authentication & Authorisation Design (Part 5)

Status: implemented baseline (demo + production code paths), pending external penetration test and DPO/legal review.
Owner: identity & application security. Last updated: 2026-11-17.

This document is the authoritative description of how SchoolOS authenticates people, binds
sessions to tenants, enforces roles and MFA, and keeps the demo environment safe. It records
what is **production**, what is **demo-only**, and what is **deferred with risk**.

---

## 1. Current state before Part 5

```
Browser ──cookie(schoolos_session = HMAC(JSON)))──> BFF (zero-dep Node)
                                                    │  mints HS256 demo JWT
                                                    └──────────────> API (Spring)
                                                                     ├─ TenantResolutionFilter (school_id claim)
                                                                     ├─ CurrentUser / PolicyService (role→perm)
                                                                     └─ Postgres RLS (set_config per tx)

Keycloak realm imported but not used by the browser flow. Demo login = POST /demo/session
{role} which mints an identity without credentials, MFA, expiry policy or revocation.
```

Defects found in discovery:

| # | Finding | Risk | Resolution |
|---|---|---|---|
| A1 | Session was a signed **client-held JSON blob** with no server-side revocation | stolen cookie valid until exp; logout does not revoke | opaque 256-bit id + server-side store (memory / Redis), revocation on logout/all-sensitive events |
| A2 | Cookie name `schoolos_session`, no `__Host-` prefix, configurable `Secure` | cookie tossing / downgrade risk | `__Host-schoolos_session` whenever TLS is on; startup refusal without `Secure` in prod |
| A3 | `/demo/session` accepted a role with no credential, MFA or guard beyond profile | unsafe if mis-profiled | demo requires generated per-environment password + TOTP for privileged roles; guard refuses prod-like config |
| A4 | CSRF compared only against a session field; no Origin check, no CSRF cookie | CSRF via same-site form post | double-submit cookie + session field + strict Origin/Referer + custom header |
| A5 | No rate limit, lockout or response-time floor | credential stuffing / enumeration | IP+account token buckets, exponential backoff, uniform errors, timing floor |
| A6 | `DemoSecurityConfig` accepted HS256 in whichever profile was active; no audience/issuer checks | forged token if profile mis-set | demo decoder only in `demo`; production validates Keycloak issuer + audience + clock skew ≤30 s, asymmetric only |
| A7 | Tenant filter trusted `school_id` claim without membership lookup | a valid token with a stale/forged tenant could reach RLS helpers | membership check per request (subject+school+active), role taken from membership, not client |
| A8 | Policy checks were ad-hoc in controllers; no deny-by-default proof | forgotten endpoint = open | `@RequirePermission` on every mapping + catalog test that fails on unannotated routes |
| A9 | No step-up, no audit chain, no session list/revoke | cannot prove who saw sensitive data | step-up claim + `StepUpFilter`, hash-chained security log, session management endpoints |
| A10 | Demo identities were hard-coded and shared across environments | demo could reach prod data if profile leaked | demo accounts are a closed allow-list; guard + `DEMO_MODE` + generated secrets file |

---

## 2. Target architecture

```
                       ┌──────────────────────────────────────────────┐
 Web (PWA)             │  Keycloak (single realm "schoolos")          │
  │ 1. click login     │  Authorization Code + PKCE (S256)            │
  │───────────────────>│  Passkeys/WebAuthn · TOTP · backup codes     │
  │ 2. redirect        │  brute-force + password policy + sessions    │
  │<───────────────────│  back-channel logout                         │
  │                    └───────────────┬──────────────────────────────┘
  │ 3. callback (code,state)           │ id_token / userinfo / roles
  ▼                                    ▼
 BFF (confidential client)  ── session record (opaque id, server-side) ──> Redis | memory(tests)
  │  - tokens live server-side only (never in browser JS, never localStorage)
  │  - CSRF, Origin, rate limit, headers, step-up, tenant switch, audit
  │  - demo identity adapter (profile=demo only)
  ▼  Authorization: Bearer <access token>  + X-Request-Id
 API (Spring resource server)
  ├─ JwtDecoder: issuer, JWKS cache, RS256/ES256 only, exp/nbf, aud, azp, clock skew 30 s
  ├─ MembershipAuthoritiesConverter: realm/client roles → SchoolRole, membership must exist & active
  ├─ StepUpFilter: sensitive permission requires amr/acr step-up within TTL
  ├─ @RequirePermission / PolicyService (deny by default) + catalog test
  └─ TenantContext from validated claim → RLS set_config(..., true)
```

Mobile (Capacitor) and desktop (Tauri) use RFC 8252: system browser, PKCE, custom scheme /
universal link redirect, refresh token in OS secure store (Keychain/Keystore through
`packages/platform`), biometric unlock as a *local* gate only. Certificate pinning is a
build-time mobile configuration item; see `docs/PLATFORM_SPIKE.md`. This repository does not
ship a native build, so native token storage is a documented integration point (deferred).

### 2.1 Production vs demo

| Concern | Production | Demo |
|---|---|---|
| Identity provider | Keycloak OIDC code+PKCE, confidential BFF client | demo adapter inside BFF, same session/CSRF/step-up pipeline |
| Credentials | Keycloak, Argon2id/PBKDF2 per realm policy, HIBP check | random password per environment, written to git-ignored `.demo/credentials.json` |
| MFA | mandatory per matrix, WebAuthn preferred | TOTP pre-enrolled; secret revealed in demo picker only |
| Session store | Redis (`REDIS_URL`) | memory store |
| Seeded data | none | `DemoSeedRunner` (tenancy) + mock adapter data (documented in FRONTEND_WIRING) |
| Demo endpoints | **absent** (`404`) | `/demo/*`, picker, ribbon |
| Guard | refuses demo flags, default secrets, HTTP issuer, weak cookies | — |

Everything demo lives in `services/bff/src/demo/`, `services/bff/src/identity/demo-*.js`,
`services/api/.../demo/`, `DemoSecurityConfig`, `DemoStartupGuard`, and is unreachable in a
production profile.

---

## 3. Roles and permission matrix

Realm roles use the API spelling (`SCHOOL_ADMIN`), mapped 1:1 to `SchoolRole`. The UI has
display aliases (`director`, `deputy`, …). A user may have several memberships (one per
school); the JWT carries the **active** school only; switching school re-issues a session.

| Role | Typical scope | MFA | Key permissions (API) | Dashboard |
|---|---|---|---|---|
| `PLATFORM_ADMIN` | platform console, separate realm | **required + IP allow-list** | `platform.admin`, `security.read`, `audit.read` | platform health, tenant list, auth events, impersonation requests |
| `GROUP_ADMIN` | multi-school group | **required** | cross-school aggregates, `audit.read` | group aggregates only |
| `DIRECTOR` (head) | one school | **required** | all school data incl. `safeguarding.read`, `billing.manage`, `hr.read`, `security.read` | enrolment, attendance, approvals, finance snapshot, security summary |
| `SCHOOL_ADMIN` | one school | **required** | school settings, people, billing, `security.read` | same as head minus safeguarding detail |
| `DEPUTY` (vie scolaire) | one school | required | attendance write, absences, lateness, messages | missing registers, unjustified absences, lateness board |
| `TEACHER` | own classes | encouraged/enforced by policy | `student.read` (class-scoped), `attendance.write`, `lesson.write`, `message.write` | timetable, registers, marking queue, messages, homework |
| `ASSISTANT` | classes | policy | attendance write, messages | timetable, registers |
| `PARENT`/`GUARDIAN` | own children only | optional then prompted | child-scoped read, `absence.create`, `billing.read` (own), messages | child switcher, today per child, grades, homework, payments, consents |
| `STUDENT` | own data | per school policy | own timetable/grades/homework | timetable, homework, grades, announcements |
| `SAFEGUARDING` | safeguarding cases | **required** | `safeguarding.read/write`, `student.read`, `export` (step-up) | confidential counts/tasks, detail behind step-up |
| `NURSE` | health records | **required** | `health.read/write`, `student.read` | confidential health tasks, detail behind step-up |
| `FINANCE` / `ACCOUNTANT` | billing | **required** | `billing.read/manage`, `export` (step-up) | outstanding invoices, reconciliation, dunning |
| `HR` | staff data | **required** | `hr.read/write`, `export` (step-up) | leave requests, contracts, onboarding |
| `IT_ADMIN` | tenant configuration | **required** | `security.read`, sessions, flags (school scope) | tickets, sessions, security alerts |
| `LIBRARIAN` | library | optional | `library.read/write` | loans, overdues |
| `RECEPTION` | visitor desk | optional | `reception.read/write`, `student.read` (minimal) | visitors on site, sign-in/out |
| `AUDITOR` | read-only inspection | **required** | `audit.read`, `export` (step-up), **no write** | read-only audit view, exports |
| Legacy: `OWNER`, `THERAPIST`, `ADMISSIONS`, `INSTRUCTOR`, `PROVIDER`, `OPERATOR` | kept for compatibility | per policy | unchanged subset, mapped to nearest modern role in UI | legacy dashboards |

Rules that override the matrix:

* **Parent/child**: the API resolves the guardian relationship from enrolment data;
  `student.read` for a guardian is always filtered to their own children. A client-supplied
  student id outside that set is a 403, tested.
* **Student**: no staff routes, no other students; tested.
* **Impersonation**: only `PLATFORM_ADMIN` (and `SCHOOL_ADMIN` with a support flag), reason
  required, ≤ 30 min, audit event + user notification, **never** for `safeguarding.*` or
  `health.*`. Banner is rendered from the session claim, not from client state.
* **Deny by default**: a controller mapping without `@RequirePermission` or `@PublicEndpoint`
  fails `ControllerPolicyCatalogTest`; at runtime an unknown permission is denied.

---

## 4. Sessions and tokens

| Control | Value | Evidence |
|---|---|---|
| Session id | 256-bit random, opaque, server-side record | `services/bff/src/store/*`, `session.js` |
| Cookie | `__Host-schoolos_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` (prefix requires Secure) | `test/session-hardening.test.js` |
| CSRF | double-submit cookie + session field + `X-CSRF-Token` + Origin/Referer allow-list | same |
| Access token | ≤ 300 s (`ACCESS_TOKEN_TTL`) | `config.js`, realm JSON |
| Refresh | rotation + reuse detection → revoke family + security event | `identity/refresh.js` |
| Idle timeout | 15 min privileged, 30 min others (`IDLE_TIMEOUT_*`) | `session.js` |
| Absolute | 12 h staff, 7 d parent with remember-me opt-in | `session.js`, `makeSession` |
| Binding | UA family + coarse IP /24; change → event + re-auth prompt, not hard block | `security/fingerprint.js` |
| Concurrency | privileged roles: 5 active sessions, oldest revoked | `store` + `enforceConcurrency` |
| Revocation | logout, password change, role change, disable, “sign out everywhere” | `/auth/logout`, `/auth/logout-all`, `/security/sessions` |
| Back-channel logout | Keycloak `logout_token` (signed), `sid`/`sub` → revoke | `/auth/backchannel-logout` |

Sliding renewal never extends past the absolute cap. The browser never receives access or
refresh tokens; only the opaque cookie and the non-sensitive CSRF token.

---

## 5. MFA and step-up

* Factors: **WebAuthn/passkeys** (preferred), TOTP, hashed single-use backup codes.
  SMS is not implemented; if enabled it is a per-school setting flagged weaker.
* Mandatory roles: platform admin, group admin, director/head, school admin, deputy,
  safeguarding, nurse/health, finance/accountant, HR, IT admin, auditor (export rights).
  Teachers: enforced when school policy sets `requireMfaStaff`; parents prompted, students
  per school policy.
* TOTP: RFC 6238, SHA-1, 6 digits, 30 s, ±1 window. Backup codes: 10 × 8 chars, SHA-256 with
  per-user salt, single-use. Enrollment requires two consecutive codes (proof of clock).
* Step-up: sensitive actions (`safeguarding.read`, `health.read`, `billing.manage`,
  `export`, `erasure`, role change, MFA/email/password change) require
  `step_up` ≤ 10 min in the JWT; otherwise API returns `403 step_up_required`, UI opens the
  “Confirm it’s you” modal.
* Trusted devices: ≤ 30 days, revocable, never silently skipped for privileged roles.

## 6. Onboarding, recovery

* Invitation-only. Signed, single-use, ≤ 7 days, bound to email+role+tenant, hashed at rest.
  Bulk invite is part of the import path.
* Parent self-registration only with a school-issued family code + identity confirmation,
  rate-limited. No open sign-up in the realm (`registrationAllowed=false`).
* Recovery: single-use <= 15 min hashed tokens, invalidates all sessions, notification email.
  Staff recovery requires MFA or admin-assisted verified flow. No silent MFA bypass.
* Reset/signup endpoints use uniform responses and a constant-time floor.

## 7. Audit, monitoring, abuse

* Append-only security event log with hash chain
  (`prevHash` + canonical JSON + SHA-256), stored server-side; export for auditors.
  Events: login success/failure, MFA enrol/remove/challenge, lockout, reset request, token
  reuse, session revoke, role change, impersonation, tenant switch, policy denial.
* No passwords, tokens, TOTP secrets or backup codes in logs. Subject is pseudonymised in
  operational logs; the audit record keeps the minimum identifier needed for investigation.
* Alerts: new device login, MFA change, password change, suspicious activity banner.
* Anomaly rules (coarse): many failures per IP = stuffing; impossible travel by coarse geo;
  off-hours privileged login. Alerts surface in the Security Centre.
* Rate limits at BFF and edge; uniform error shapes; WAF-friendly (no bespoke encoding).

## 8. Headers and client rules

CSP (HTML): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'none';
frame-ancestors 'none'; object-src 'none'; form-action 'self'`.
HSTS (preload-ready when HTTPS), `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`,
`Cross-Origin-Resource-Policy: same-origin`, `Cache-Control: no-store` on authenticated
responses. CORS: explicit allow-list only, never `*` with credentials.
`style-src 'unsafe-inline'` is retained because React style attributes are used in charts;
there are **no inline scripts**, so no script nonce is needed. Residual risk recorded in the
security checklist.

## 9. STRIDE threat model (login / session / MFA / reset / tenant switch)

| Threat | Scenario | Mitigation | Test |
|---|---|---|---|
| **Spoofing** | credential stuffing, phishing | rate limit + lockout + backoff, WebAuthn preferred, uniform errors, HIBP check, invite-only | `auth-hardening.test.js`, `identity.test.js` |
| Spoofing | forged/tampered JWT, `alg=none` | JWKS signature, algorithms allow-list, iss/aud/exp/nbf/azp, 30 s skew | `JwtValidationTest` |
| Spoofing | stolen session cookie | opaque id, HttpOnly+Secure+`__Host-`, UA/IP binding signals, revocation, concurrency cap | `session-hardening.test.js` |
| **Tampering** | CSRF state-changing request | double-submit + Origin + custom header + SameSite | `csrf.test.js` |
| Tampering | tenant id in body/header | tenant only from validated claim + membership lookup; no client tenant accepted | `TenantMembershipTest` |
| Tampering | open redirect on `returnTo` | allow-list of same-origin paths, reject `//`, `\`, schemes | `redirect.test.js` |
| **Repudiation** | admin denies viewing a record | hash-chained audit, step-up, “who accessed this student” report | `audit-chain.test.js` |
| **Information disclosure** | user enumeration on login/reset | generic messages, constant-time floor, no account-exists signal | `auth-hardening.test.js` |
| Info disclosure | tokens in URL/localStorage/logs | tokens only server-side; URL never carries tokens; redaction in logger | grep test + review |
| Info disclosure | safeguarding/health data in lists/toasts | counts only, detail behind step-up, no case content in URLs | web tests |
| **Denial of service** | login flood / lockout abuse | per-IP+account buckets, exponential backoff, CAPTCHA/PoW hook after repeated failures | `rate-limit.test.js` |
| **Elevation of privilege** | role claim edited, missing policy | signature + membership role, deny-by-default catalog, role matrix tests | `ControllerPolicyCatalogTest`, `RoleMatrixTest` |
| EoP | parent reads another child | server-side guardian relation filter | `ParentScopeTest` |
| EoP | demo mode in prod | `DemoStartupGuard` + BFF guard: env, issuer, DB, secrets, cookie flags | `DemoStartupGuardTest`, `demo-guard.test.js` |
| EoP | impersonation misuse | platform-only, reason, time-box, audit, forbidden for safeguarding/health | `impersonation.test.js` |
| **Session** | refresh reuse | rotation + family revoke + alert | `refresh-rotation.test.js` |
| Session | idle session left open | idle + absolute timeouts, back-channel logout | `session-timeout.test.js` |

Residual risks: no external pen test yet; SMS fallback not built (good); WebAuthn server
verification is implemented for ES256/RS256 attestation-less flows and needs a device-lab
pass; Redis is single-node in compose; CSP keeps `style-src 'unsafe-inline'`.

## 10. Decisions (recorded in DECISIONS.md)

1. Keep Keycloak as the only production IdP; no home-made token format.
2. BFF performs code+PKCE as a confidential client; browser holds only an opaque cookie.
3. Opaque server-side sessions with Redis, memory in tests/demo.
4. Demo identity adapter reuses the production session/CSRF/step-up pipeline, never a
   direct “role → authenticated” shortcut; passwords generated per environment.
5. Deny-by-default via annotations + catalog test.
6. Membership (DB) is authoritative for tenant+role; JWT `school_id` must match it.
7. Step-up as a short-lived `step_up` claim minted by the BFF after MFA.
8. Passkeys via WebAuthn; production attestation policy `none` (documented), ES256/RS256.
9. Security event log hash chain in the BFF store; export in JSONL.
10. Demo accounts closed allow-list, `@demo.schoolos.invalid`, no real people.

## 11. Deferred (with reason and risk)

| Item | Reason | Risk / mitigation |
|---|---|---|
| External penetration test | requires vendor + staging window | **High until done**; tracked in PILOT_READINESS, no real data before |
| HIBP online k-anonymity call | offline dev / no third-party calls in Phase 1 | local blocklist of common passwords + zxcvbn-style length rules; production must enable HIBP before pilot |
| Argon2id in Keycloak 25 | not built-in; PBKDF2-SHA512 210k configured | documented; upgrade to Keycloak 26+/Argon2 SPI before pilot |
| Mobile/desktop secure storage + pinning | no native build in repo | documented integration points; web is the only shipped client |
| Full WebAuthn attestation formats (packed/tpm) | attestation policy `none`; only ES256/RS256 | phishing resistance unchanged for passkeys; enterprise attestation deferred |
| SMS fallback | weaker factor, no provider | deliberately absent; school setting reserved |
| Geo-IP impossible travel | needs a geo database / privacy review | coarse rule stub + event; enable with DPO approval |
| Edge WAF / CAPTCHA vendor | no third-party trackers in Phase 1 | rate limit + proof-of-work hook; WAF at deployment |
| Automatic nightly demo reset | job scheduler not in this slice | manual rate-limited reset endpoint + script; documented |
| Real e-mail delivery for alerts | Mailpit only | templates + Mailpit integration; production SMTP config in deployment |
