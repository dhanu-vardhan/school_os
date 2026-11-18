# Demo accounts and safe demo mode

SchoolOS ships a deliberately narrow demo mode for sales, training and UI review. It is
**not** a second authentication path: demo identities use the same opaque server-side
session, CSRF, MFA, step-up, rate-limit and audit pipeline as production identities. This
document lists the accounts, how credentials are generated, and how the stack refuses to run
demo mode in a production-like configuration.

For the architecture and threat model see [`AUTH_DESIGN.md`](./AUTH_DESIGN.md). For the
short scripted walkthrough see [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

---

## 1. Enabling demo mode

Demo mode requires **both** flags. Either one alone disables the demo endpoints and the
picker falls back to the normal credential form.

| Variable | Required value | Where |
|---|---|---|
| `SCHOOLOS_PROFILE` (BFF) | `demo` | BFF environment |
| `DEMO_MODE` | `true` | BFF **and** API environment |
| `SPRING_PROFILES_ACTIVE` (API) | `demo` | API environment |
| `SCHOOLOS_ENV` | `local` (or anything not `prod`/`production`) | both |

`infra/compose/docker-compose.yml` sets these for the `bff`, `api` and `redis` services.
Outside Compose:

```bash
export SCHOOLOS_PROFILE=demo DEMO_MODE=true SCHOOLOS_ENV=local
export SPRING_PROFILES_ACTIVE=demo
export COOKIE_SECURE=false            # localhost HTTP only
docker compose -f infra/compose/docker-compose.yml up -d
pnpm --filter @schoolos/web dev         # http://localhost:3000
```

The API's `DemoStartupGuard` (`services/api/.../config/DemoStartupGuard.java`) refuses to
start when `demo` is active with a non-local datasource, a non-local issuer, a default or
short JWT secret, insecure cookies outside `local`, or a missing credentials file.

The BFF's `assertSafeConfig` applies the same rules and additionally requires
`DEMO_MODE=true` whenever `SCHOOLOS_PROFILE=demo`.

---

## 2. Credentials are generated per environment

No demo password or TOTP secret exists in source, tests, compose files or fixtures.

- On first boot the BFF generates one random 20-character password and one TOTP secret per
  account and writes them to `DEMO_CREDENTIALS_FILE`.
- Default path: `<repo>/.demo/credentials.json`; in Compose it is the named volume
  `demo-credentials` mounted at `/app/.demo`.
- The file is written with mode `0600` and `.demo/` is git-ignored.
- Existing files are reused, so restarting the stack does not invalidate shared links.
- Passwords are stored as PBKDF2 hashes; the plaintext exists only so the demo picker can
  reveal it. The TOTP secret is used for the demo challenge and is never logged.

To reveal them, open `http://localhost:3000/login` and click an account card. The card signs
in with the generated password. Privileged roles then show the MFA step with a
**“Use the demo code”** button that asks the BFF for the current 6-digit code. The TOTP
secret itself is sent only by `GET /demo/accounts`, which is `404` unless demo mode is active.

To rotate credentials, stop the BFF, delete the file (or the Compose volume), and restart:

```bash
rm -f .demo/credentials.json
# or, with Compose:
docker compose -f infra/compose/docker-compose.yml down
docker volume rm sms_sof_demo-credentials 2>/dev/null || true
docker compose -f infra/compose/docker-compose.yml up -d
```

Never commit `.demo/` or paste its contents into a ticket, chat or screenshot.

---

## 3. Accounts

Two demo tenants are seeded:

- **Lycée Démo Jean-Moulin** — `11111111-1111-4111-8111-111111111111`
- **École Démo Les Tilleuls** — `22222222-2222-4222-8222-222222222222`

One active account per role. `MFA` means the account is challenged for TOTP after its
password. Names and titles are fictional.

| Key | Display role | Name | School | MFA |
|---|---|---|---|---|
| `super-admin` | Platform operator | Sophie Laurent | Jean-Moulin | yes |
| `group-admin` | Group administrator | Marc Delaunay | Jean-Moulin + Les Tilleuls | yes |
| `director` | Director | Camille Durand | Jean-Moulin | yes |
| `admin` | Administrator | Nora Benali | Jean-Moulin | yes |
| `deputy` | Deputy director | Yanis Petit | Jean-Moulin | yes |
| `teacher` | Teacher | Élise Martin | Jean-Moulin | no |
| `teacher-parttime` | Teacher | Thomas Roux | Les Tilleuls | no |
| `parent` | Parent/guardian | Alex Moreau | both schools | no |
| `parent-2` | Parent/guardian | Sarah Cohen | Jean-Moulin | no |
| `guardian` | Parent/guardian (family portal, legacy key) | Camille Martin — *Famille Martin* | Jean-Moulin (demo) | no |
| `guardian2` | Parent/guardian (family portal, legacy key) | Alex Moreau — *foyer séparé* | Jean-Moulin (demo) | no |
| `student-college` | Student | Léa Martin | Jean-Moulin | no |
| `student-lycee` | Student | Tom Durand | Jean-Moulin | no |
| `safeguarding` | Safeguarding lead | Dr Paul Girard | Jean-Moulin | yes |
| `nurse` | School nurse | Inès Haddad | Jean-Moulin | yes |
| `finance` | Finance | Lucie Bernard | Jean-Moulin | yes |
| `accountant` | Accountant | Hugo Leroy | Les Tilleuls | yes |
| `hr` | Human resources | Mina Diallo | Jean-Moulin | yes |
| `it-admin` | IT administrator | Gabriel Fontaine | Jean-Moulin | yes |
| `librarian` | Librarian | Manon Perrin | Jean-Moulin | no |
| `reception` | Reception | Emma Rivière | Jean-Moulin | no |
| `auditor` | Auditor | Claire Fontaine | Jean-Moulin | yes |

Legacy keys (`assistant`, `admissions`, `guardian`, `guardian2`, `instructor`, `provider`,
`operator`) remain in the closed allow-list so older links keep working, but they are hidden
from the picker (`?legacy=1` is not exposed; use the API directly only in local demos).

### PROMPT 005 family portal demo scenarios (web/mock)

The guardian portal (`/family`, G1–G20) uses explicit demo guardian identities and scoped fixtures:

| Demo login key | Display family | Linked children | Notes |
|---|---|---|---|
| `guardian` | **Famille Martin** (Camille Martin, `demo-guardian`) | **Léa** (MS A, stu-1) and **Tom** (CP A, stu-2) | Canonical two-child household for dashboard, attendance, homework, grades, forms, billing, etc. |
| `guardian2` | **Alex Moreau** (`demo-guardian-2`) | **Tom** (CP A, stu-2) | Separated household / second parent; explicit court-order restrictions in demo data (`collect_child`, `media`) while school information remains visible where not restricted. |
| `demo-guardian-petit` | **Famille Petit** (no picker card) | stu-5, stu-9 (different classes) | Used in tests for IDOR/scoping; not exposed in the demo picker. |

- `demoLogin('guardian')` lands on `/family`; `demoLogin('guardian2')` lands on `/family` with Tom-only scope.
- In mock mode, guardian scope and restrictions are derived from the session (never from request body/query), and demo step-up refreshes `stepUpUntil` on the current session.
- The picker visibility and BFF credential generation still follow the safety rules above; use the family keys in local/demo and automated tests only.

### Tenant switching

`parent` and `group-admin` belong to both schools. After sign-in the app shows
`/schools/select`; switching calls `POST /auth/switch-school`, which validates the membership
server-side and issues a **new** session id. The previous cookie is invalid immediately. The
client never sends a school header or tenant id.

### MFA and step-up

- Privileged roles must complete TOTP before a session is issued.
- Sensitive actions (safeguarding detail, exports, impersonation) require a step-up no older
  than 10 minutes (`STEP_UP_SECONDS`).
- Account & Security (`/app/account/security`) lets the user enrol/reconfigure TOTP, list and
  revoke sessions, export their own security log, and sign out everywhere.
- Security Centre (`/app/security`) is limited to `security.read`: directors, admins,
  IT admins, safeguarding leads, auditors and platform operators. It shows login/MFA counts,
  the audit-chain integrity check and recent events.

In real OIDC mode these pages redirect TOTP enrolment and step-up to the Keycloak account
console instead of handling secrets locally.

---

## 4. Safety guards

| Guard | Behaviour |
|---|---|
| Startup guard (API + BFF) | Refuses `demo` in production-like environments, non-local DB/issuer, default/short secrets, insecure cookies outside `local`, missing credentials file. |
| Endpoint gating | Every `/demo/*` route returns `404` when `demoEnabled` is false. |
| Closed allow-list | `POST /demo/session` accepts only known keys; no arbitrary role can mint a session. |
| Password required | A role name alone is not enough; the generated per-environment password is verified with PBKDF2. |
| No bypass of MFA | Privileged demo accounts go through the same challenge, attempt cap and rate limiter as production. |
| CSRF + Origin | All demo mutating calls require the CSRF cookie/header and an allowed Origin. |
| No secrets in code | Tests and CI grep for demo passwords; credentials live only in `.demo/credentials.json` (0600, ignored). |
| Honest UI | The picker and pages show a demo/mock ribbon; demo mode never claims production readiness. |

Demo mode has not been penetration-tested. Treat a publicly reachable demo deployment as a
shared training environment with fictional data only; never point it at real school data or
reuse its secrets elsewhere.
