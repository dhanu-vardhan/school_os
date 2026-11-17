import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { generatePassword, hashPassword, verifyPassword } from './passwords.js'
import { generateTotpSecret } from './totp.js'
import { MFA_REQUIRED_ROLES, ROLES } from './roles.js'

export const SCHOOL_A = '11111111-1111-4111-8111-111111111111'
export const SCHOOL_B = '22222222-2222-4222-8222-222222222222'
export const SCHOOL_A_NAME = 'Lycée Démo Jean-Moulin'
export const SCHOOL_B_NAME = 'École Démo Les Tilleuls'

const A = { schoolId: SCHOOL_A, schoolName: SCHOOL_A_NAME }
const B = { schoolId: SCHOOL_B, schoolName: SCHOOL_B_NAME }

function account(key, name, role, memberships, extra = {}) {
  const emailKey = key.replace(/[^a-z0-9]+/gi, '.').toLowerCase()
  return {
    key,
    sub: `demo-${key}`,
    name,
    email: `${emailKey}@demo.schoolos.invalid`,
    locale: 'fr',
    demo: true,
    apiRoles: [role],
    memberships: memberships.map(m => ({ ...m, role })),
    ...extra,
  }
}

/**
 * One realistic account per role. Closed allow-list: no arbitrary role can mint a session.
 * `parent` belongs to both schools to demonstrate the tenant switcher.
 */
export const DEMO_ACCOUNTS = [
  account('super-admin', 'Sophie Laurent', ROLES.PLATFORM_ADMIN, [A], {
    title: 'Super-administrateur plateforme', scope: 'Plateforme SchoolOS', schoolName: 'Plateforme SchoolOS',
  }),
  account('group-admin', 'Marc Delaunay', ROLES.GROUP_ADMIN, [A, B], {
    title: 'Administrateur de groupe', scope: 'Groupe Jean-Moulin / Les Tilleuls',
  }),
  account('director', 'Camille Durand', ROLES.DIRECTOR, [A], {
    title: 'Chef d’établissement', scope: SCHOOL_A_NAME,
  }),
  account('admin', 'Nora Benali', ROLES.ADMIN, [A], {
    title: 'Administratrice scolaire', scope: SCHOOL_A_NAME,
  }),
  account('deputy', 'Yanis Petit', ROLES.DEPUTY, [A], {
    title: 'Vie scolaire', scope: SCHOOL_A_NAME,
  }),
  account('teacher', 'Élise Martin', ROLES.TEACHER, [A], {
    title: 'Enseignante — 6 classes', scope: SCHOOL_A_NAME,
  }),
  account('teacher-parttime', 'Thomas Roux', ROLES.TEACHER, [B], {
    title: 'Enseignant à temps partiel — 2 classes', scope: SCHOOL_B_NAME,
  }),
  account('parent', 'Alex Moreau', ROLES.GUARDIAN, [
    { ...A, childIds: ['stu-1', 'stu-2'] },
    { ...B, childIds: ['stu-b1'] },
  ], { title: 'Parent — 2 enfants dans 2 établissements', scope: `${SCHOOL_A_NAME} + ${SCHOOL_B_NAME}` }),
  account('parent-2', 'Sarah Cohen', ROLES.GUARDIAN, [{ ...A, childIds: ['stu-3'] }], {
    title: 'Parent — 1 enfant', scope: SCHOOL_A_NAME,
  }),
  account('student-college', 'Léa Martin', ROLES.STUDENT, [{ ...A, childIds: ['stu-1'] }], {
    title: 'Élève — 4e', scope: SCHOOL_A_NAME,
  }),
  account('student-lycee', 'Tom Durand', ROLES.STUDENT, [{ ...A, childIds: ['stu-2'] }], {
    title: 'Élève — Terminale', scope: SCHOOL_A_NAME,
  }),
  account('safeguarding', 'Dr Paul Girard', ROLES.SAFEGUARDING, [A], {
    title: 'Référent protection de l’enfance', scope: SCHOOL_A_NAME,
  }),
  account('nurse', 'Inès Haddad', ROLES.NURSE, [A], {
    title: 'Infirmière scolaire', scope: SCHOOL_A_NAME,
  }),
  account('finance', 'Lucie Bernard', ROLES.FINANCE, [A], {
    title: 'Responsable financière', scope: SCHOOL_A_NAME,
  }),
  account('accountant', 'Hugo Leroy', ROLES.ACCOUNTANT, [B], {
    title: 'Comptable', scope: SCHOOL_B_NAME,
  }),
  account('hr', 'Mina Diallo', ROLES.HR, [A], {
    title: 'Ressources humaines', scope: SCHOOL_A_NAME,
  }),
  account('it-admin', 'Gabriel Fontaine', ROLES.IT_ADMIN, [A], {
    title: 'Administrateur informatique', scope: SCHOOL_A_NAME,
  }),
  account('librarian', 'Manon Perrin', ROLES.LIBRARIAN, [A], {
    title: 'Documentaliste', scope: SCHOOL_A_NAME,
  }),
  account('reception', 'Emma Rivière', ROLES.RECEPTION, [A], {
    title: 'Accueil / desk visiteurs', scope: SCHOOL_A_NAME,
  }),
  account('auditor', 'Claire Fontaine', ROLES.AUDITOR, [A], {
    title: 'Auditrice — lecture seule', scope: SCHOOL_A_NAME,
  }),
  // Legacy demo keys kept so existing screens/tests keep working.
  account('assistant', 'Yanis Petit', ROLES.ASSISTANT, [A], { title: 'Assistant pédagogique', scope: SCHOOL_A_NAME, legacy: true }),
  account('admissions', 'Nora Benali', ROLES.ADMISSIONS, [A], { title: 'Admissions', scope: SCHOOL_A_NAME, legacy: true }),
  account('guardian', 'Alex Moreau', ROLES.GUARDIAN, [{ ...A, childIds: ['stu-1', 'stu-2'] }], { title: 'Parent', scope: SCHOOL_A_NAME, legacy: true }),
  account('guardian2', 'Sarah Cohen', ROLES.GUARDIAN, [{ ...A, childIds: ['stu-3'] }], { title: 'Second parent', scope: SCHOOL_A_NAME, legacy: true }),
  account('instructor', 'Mina Diallo', ROLES.INSTRUCTOR, [A], { title: 'Intervenant', scope: SCHOOL_A_NAME, legacy: true }),
  account('provider', 'Club Échecs Paris', ROLES.PROVIDER, [A], { title: 'Prestataire', scope: SCHOOL_A_NAME, legacy: true }),
  account('operator', 'Sophie Laurent', ROLES.OPERATOR, [A], { title: 'Opérateur plateforme', scope: 'Plateforme SchoolOS', legacy: true }),
]

const BY_KEY = new Map(DEMO_ACCOUNTS.map(a => [a.key, a]))

export function findDemoAccount(key) {
  return BY_KEY.get(key) || null
}

export function demoAccountForMembership(key, schoolId) {
  const account = findDemoAccount(key)
  if (!account) return null
  const membership = schoolId
    ? account.memberships.find(m => m.schoolId === schoolId)
    : account.memberships[0]
  if (!membership) return null
  return { account, membership }
}

export function accountNeedsMfa(account) {
  return account.memberships.some(m => MFA_REQUIRED_ROLES.has(m.role))
}

export function publicDemoAccounts(credentials) {
  return DEMO_ACCOUNTS.map(account => {
    const secret = credentials?.accounts?.[account.key] || {}
    return {
      key: account.key,
      name: account.name,
      email: account.email,
      role: account.apiRoles[0],
      title: account.title,
      scope: account.scope,
      schoolId: account.memberships[0].schoolId,
      schoolName: account.memberships[0].schoolName,
      schools: account.memberships.map(m => ({ id: m.schoolId, name: m.schoolName })),
      mfa: accountNeedsMfa(account),
      legacy: !!account.legacy,
      // Demo-only reveal, gated by DEMO_MODE and served only by /demo/accounts.
      demoPassword: secret.password || null,
      demoTotpSecret: accountNeedsMfa(account) ? secret.totpSecret || null : null,
    }
  })
}

/**
 * Loads per-environment demo credentials, generating them on first boot. The file is
 * git-ignored and mode 0600; passwords are never logged. Existing files are reused so a
 * demo reset does not invalidate the picker links.
 */
export async function loadDemoCredentials(config) {
  const file = config.credentialsFile
  try {
    const raw = await fsp.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed?.version === 1 && parsed.accounts) return parsed
  } catch {
    // generate below
  }
  const accounts = {}
  for (const account of DEMO_ACCOUNTS) {
    const password = generatePassword(20)
    const totpSecret = generateTotpSecret()
    accounts[account.key] = {
      password,
      passwordHash: hashPassword(password),
      totpSecret,
      mfaEnrolled: accountNeedsMfa(account),
      generatedAt: new Date().toISOString(),
    }
  }
  const payload = { version: 1, demoOnly: true, generatedAt: new Date().toISOString(), accounts }
  await fsp.mkdir(path.dirname(file), { recursive: true })
  await fsp.writeFile(file, JSON.stringify(payload, null, 2), { mode: 0o600 })
  try { fs.chmodSync(file, 0o600) } catch { /* best effort on Windows */ }
  return payload
}

export function verifyDemoCredentials(account, password, credentials) {
  const entry = credentials?.accounts?.[account.key]
  if (!entry) return false
  if (entry.passwordHash) return verifyPassword(password, entry.passwordHash)
  return false
}

export function demoPasswordFor(accountKey, credentials) {
  return credentials?.accounts?.[accountKey]?.password || null
}

export function demoTotpSecretFor(accountKey, credentials) {
  return credentials?.accounts?.[accountKey]?.totpSecret || null
}

export function newDemoChallengeId() {
  return crypto.randomBytes(24).toString('base64url')
}

/** Used by the seed script and tests; never by request handlers. */
export function demoAccountSummary() {
  return DEMO_ACCOUNTS.map(a => ({ key: a.key, role: a.apiRoles[0], name: a.name, email: a.email }))
}
