/**
 * Guardian portal policy engine — pure functions, no I/O.
 *
 * These rules encode the legal constraints of PROMPT 005 and are the single place where
 * "who may see/sign/collect what" is decided on the client. The API implements the same
 * rules server-side (`com.schoolos.family.FamilyPolicy`); both are covered by tests. No
 * function here infers custody: only explicit `GuardianLink` flags are read.
 */
import type {
  AbsencePeriod, AttendanceCounters, Bulletin, ConsentProof, FamilyAnnouncement,
  FamilyAttendanceDay, FamilyPolicy, FamilyTimetableEntry, FormAssignment, GradeEntry,
  GuardianInvitation, GuardianLink, GuardianRestriction, NotificationCategory,
  SignatoryRuleMode, SubjectAverage,
} from './types'

const DAY_MS = 86_400_000

export const DEFAULT_SIGNATORY_RULES: Record<string, SignatoryRuleMode> = {
  trip: 'both_guardians',
  outing: 'both_guardians',
  autonomous_departure: 'both_guardians',
  image_rights: 'one_guardian',
  activity_registration: 'one_guardian',
  rules_acceptance: 'legal_representative_only',
  contract: 'legal_representative_only',
  health_document: 'legal_representative_only',
  custom: 'one_guardian',
}

export function isoDay(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

function parseDay(value: string): number {
  const [y, m, d] = isoDay(value).split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(value: string | Date, days: number): string {
  return new Date(parseDay(isoDay(value)) + days * DAY_MS).toISOString().slice(0, 10)
}

export function differenceInDays(a: string, b: string): number {
  return Math.round((parseDay(a) - parseDay(b)) / DAY_MS)
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function isLinkActive(link: GuardianLink, today: string): boolean {
  if (link.status !== 'active') return false
  if (differenceInDays(today, link.validFrom) < 0) return false
  if (link.validTo && differenceInDays(today, link.validTo) > 0) return false
  return true
}

export function activeLinks(links: GuardianLink[], today: string): GuardianLink[] {
  return links.filter(link => isLinkActive(link, today))
}

export function effectiveRestrictions(restrictions: GuardianRestriction[], today: string): GuardianRestriction[] {
  return restrictions.filter(restriction => {
    if (!restriction.active) return false
    if (differenceInDays(today, restriction.effectiveFrom) < 0) return false
    if (restriction.effectiveTo && differenceInDays(today, restriction.effectiveTo) > 0) return false
    return true
  })
}

export type DataClass = 'information' | 'records' | 'media' | 'collection' | 'contact' | 'address'

const BLOCKED_BY: Record<GuardianRestriction['type'], DataClass[]> = {
  school_information: ['information', 'records', 'media'],
  records: ['records'],
  media: ['media'],
  collect_child: ['collection'],
  contact_with_child: ['contact'],
  address_disclosure: ['address'],
}

/** A restriction denies the restricted data class only — nothing else. */
export function restrictionBlocks(
  restrictions: GuardianRestriction[],
  dataClass: DataClass,
  today: string,
): boolean {
  return effectiveRestrictions(restrictions, today).some(restriction =>
    BLOCKED_BY[restriction.type].includes(dataClass),
  )
}

export function blockingRestriction(
  restrictions: GuardianRestriction[],
  dataClass: DataClass,
  today: string,
): GuardianRestriction | undefined {
  return effectiveRestrictions(restrictions, today).find(restriction =>
    BLOCKED_BY[restriction.type].includes(dataClass),
  )
}

/**
 * Signatories required for a form. `both_guardians` requires every guardian who holds
 * parental authority; `requiredSignerSubs` is snapshotted on the assignment so a later
 * link change cannot silently alter a signed document.
 */
export function requiredSignatories(
  mode: SignatoryRuleMode,
  links: GuardianLink[],
  today: string,
  childId: string,
): string[] {
  const eligible = activeLinks(links, today).filter(link => link.childId === childId)
  const withAuthority = eligible.filter(link => link.holdsParentalAuthority)
  if (mode === 'one_guardian') {
    const candidates = eligible.filter(link => link.holdsParentalAuthority || link.rightToInformation)
    return [...new Set(candidates.map(link => link.guardianSub))]
  }
  if (mode === 'both_guardians') return [...new Set(withAuthority.map(link => link.guardianSub))]
  return [...new Set(withAuthority.map(link => link.guardianSub))]
}

export interface SignState {
  allowed: boolean
  reason: 'ok' | 'not_eligible' | 'already_signed' | 'complete' | 'restricted' | 'withdrawn' | 'rule_unsatisfied'
  awaiting: string[]
  label: 'awaiting_you' | 'awaiting_other' | 'complete' | 'not_eligible'
}

export function signState(
  assignment: FormAssignment,
  guardianSub: string,
  links: GuardianLink[],
  restrictions: GuardianRestriction[],
  today: string,
): SignState {
  const required = assignment.requiredSignerSubs
  const signed = assignment.signatures.map(signature => signature.signerSub)
  // `one_guardian` means either linked guardian may sign; the assignment snapshot only
  // records who was eligible at issue time, so eligibility is re-derived from the links.
  const eligibleSubs = requiredSignatories(assignment.signatoryRule, links, today, assignment.childId)
  const oneGuardian = assignment.signatoryRule === 'one_guardian'
  const complete = oneGuardian
    ? signed.some(sub => eligibleSubs.includes(sub))
    : required.every(sub => signed.includes(sub))
  const awaiting = oneGuardian
    ? complete ? [] : eligibleSubs.filter(sub => !signed.includes(sub))
    : required.filter(sub => !signed.includes(sub))
  const eligible = oneGuardian ? eligibleSubs.includes(guardianSub) : required.includes(guardianSub)

  if (assignment.status === 'withdrawn') {
    return { allowed: false, reason: 'withdrawn', awaiting, label: 'awaiting_other' }
  }
  if (complete || assignment.status === 'signed') {
    const allowed = false
    return { allowed, reason: 'complete', awaiting, label: 'complete' }
  }
  if (!eligible) {
    return { allowed: false, reason: 'not_eligible', awaiting, label: 'not_eligible' }
  }
  if (signed.includes(guardianSub)) {
    return { allowed: false, reason: 'already_signed', awaiting, label: 'awaiting_other' }
  }
  if (restrictionBlocks(restrictions, 'information', today)) {
    return { allowed: false, reason: 'restricted', awaiting, label: 'awaiting_you' }
  }
  if (assignment.status === 'declined') {
    return { allowed: false, reason: 'rule_unsatisfied', awaiting, label: 'awaiting_you' }
  }
  // Guard against a forged assignment that lists a signer with no link to the child.
  const linked = activeLinks(links, today)
    .filter(link => link.childId === assignment.childId)
    .map(link => link.guardianSub)
  if (!linked.includes(guardianSub)) {
    return { allowed: false, reason: 'not_eligible', awaiting, label: 'not_eligible' }
  }
  return { allowed: true, reason: 'ok', awaiting, label: 'awaiting_you' }
}

/* ------------------------------------------------------------------ age policy */

export type MajorityAccess = 'full' | 'consent_required' | 'stopped'

/** Age at a reference date, in whole years, from an ISO birth date. */
export function ageAt(birthDate: string, today: string): number {
  const [by, bm, bd] = isoDay(birthDate).split('-').map(Number)
  const [ty, tm, td] = isoDay(today).split('-').map(Number)
  let age = ty - by
  if (tm < bm || (tm === bm && td < bd)) age -= 1
  return age
}

/**
 * At 18 the guardian's access follows school policy. The default is `require_student_consent`
 * (safest) and is flagged for legal review.
 */
export function majorityAccess(
  birthDate: string | undefined,
  today: string,
  policy: Pick<FamilyPolicy, 'agePolicy'>,
): MajorityAccess {
  if (!birthDate) return 'full'
  if (ageAt(birthDate, today) < 18) return 'full'
  if (policy.agePolicy === 'continue_read') return 'full'
  if (policy.agePolicy === 'stop') return 'stopped'
  return 'consent_required'
}

/* ------------------------------------------------------------------ notifications */

const SAFE_NOTIFICATION: Record<NotificationCategory, { title: string; body: string }> = {
  attendance: { title: 'Information de présence', body: 'Une nouvelle information de présence est disponible dans votre espace famille.' },
  grades: { title: 'Nouveau résultat scolaire', body: 'Un nouveau document scolaire est disponible dans votre espace famille.' },
  messages: { title: 'Nouveau message', body: 'Vous avez reçu un message de l’établissement.' },
  announcements: { title: 'Nouvelle annonce', body: 'Une annonce de l’établissement est disponible.' },
  forms: { title: 'Document à compléter', body: 'Un formulaire attend votre signature dans votre espace famille.' },
  appointments: { title: 'Rendez-vous', body: 'Un changement concerne un rendez-vous à venir.' },
  activities: { title: 'Activités', body: 'Une information concerne une activité périscolaire.' },
  billing: { title: 'Facturation', body: 'Une nouvelle information de facturation est disponible.' },
  documents: { title: 'Document disponible', body: 'Un document est disponible au téléchargement dans votre espace famille.' },
  safety: { title: 'Message important de l’établissement', body: 'Consultez votre espace famille ou contactez la direction.' },
}

/**
 * Push and email text never carries content (child name, reason, amount, grade…).
 * Mandatory school notices use the same scrubbed copy: content stays behind authentication.
 */
export function safeNotificationText(category: NotificationCategory): { title: string; body: string } {
  return SAFE_NOTIFICATION[category]
}

export function isMandatoryNotification(category: NotificationCategory): boolean {
  return category === 'safety' || category === 'attendance' || category === 'forms' || category === 'announcements'
}

/** A channel can be muted for optional events only; mandatory notices always deliver in-app. */
export function channelAllowed(
  preference: { inApp: boolean; email: boolean; push: boolean; mandatory: boolean },
  channel: 'in_app' | 'email' | 'push',
): boolean {
  if (preference.mandatory) return channel === 'in_app' ? true : true
  if (channel === 'in_app') return true
  return channel === 'email' ? preference.email : preference.push
}

/* ------------------------------------------------------------------ ICS feeds */

/**
 * Sensitive changes are exported with generic titles: a subscription URL can be shared or
 * leaked, so it must not reveal a medical appointment, a sanction or a family reason.
 */
export function icsTitle(entry: Pick<FamilyTimetableEntry, 'subject' | 'change'>): string {
  if (!entry.change) return entry.subject
  switch (entry.change.kind) {
    case 'trip': return 'Sortie scolaire'
    case 'cancelled': return 'Cours annulé'
    case 'replacement': return 'Cours remplacé'
    case 'room_change': return 'Changement de salle'
    default: return 'Emploi du temps modifié'
  }
}

export function icsDescription(entry: Pick<FamilyTimetableEntry, 'change'>): string {
  return entry.change ? 'Modification de l’emploi du temps — détails sur le portail.' : 'Emploi du temps — détails sur le portail.'
}

/* ------------------------------------------------------------------ messaging */

export function quietHoursState(
  quiet: { start: string; end: string; enabled?: boolean },
  now: string | Date,
  timezoneOffsetMinutes = 0,
): { quiet: boolean; nextOpen: string } {
  const date = now instanceof Date ? now : new Date(now)
  const minutes = (date.getUTCHours() * 60 + date.getUTCMinutes() + timezoneOffsetMinutes + 1440) % 1440
  const start = minutesOf(quiet.start)
  const end = minutesOf(quiet.end)
  const inWindow = start <= end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end
  const nextOpen = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
  return { quiet: !!quiet.enabled && inWindow, nextOpen }
}

export const MESSAGE_TEMPLATES = [
  { id: 'absence', label: 'Signaler une absence', subject: 'Absence de mon enfant' },
  { id: 'appointment', label: 'Demander un rendez-vous', subject: 'Demande de rendez-vous' },
  { id: 'homework', label: 'Question sur les devoirs', subject: 'Question sur le travail à la maison' },
  { id: 'canteen', label: 'Question restauration', subject: 'Question sur la restauration scolaire' },
  { id: 'other', label: 'Autre demande', subject: 'Demande à l’établissement' },
] as const

/** The portal never relays messages between guardians: only staff recipients are allowed. */
export function isAllowedMessageRecipient(recipientRole: string): boolean {
  return ['teacher', 'school_life', 'direction', 'nurse', 'librarian'].includes(recipientRole)
}

/* ------------------------------------------------------------------ canteen */

export function canteenCutoff(date: string, now: string | Date, cutoffHour = 10): { open: boolean; cutoffAt: string } {
  const cutoffAt = `${date}T${String(cutoffHour).padStart(2, '0')}:00:00`
  const current = now instanceof Date ? now.toISOString() : now
  return { open: current < cutoffAt, cutoffAt }
}

/* ------------------------------------------------------------------ attendance */

export function attendanceCounters(
  days: FamilyAttendanceDay[],
  childId: string,
  policy: Pick<FamilyPolicy, 'absenceThresholds'>,
): AttendanceCounters {
  const scoped = days.filter(day => day.childId === childId)
  const justified = scoped.filter(day => day.justification === 'justified').length
  const unjustified = scoped.filter(day => day.justification === 'unjustified').length
  const late = scoped.filter(day => day.status === 'late').length
  return {
    childId,
    justified,
    unjustified,
    late,
    threshold: policy.absenceThresholds.unjustified,
    thresholdLabel: policy.absenceThresholds.label,
    overThreshold: unjustified >= policy.absenceThresholds.unjustified,
  }
}

export function absencePeriodLabel(period: AbsencePeriod): string {
  return period === 'morning' ? 'Matin' : period === 'afternoon' ? 'Après-midi' : 'Journée entière'
}

/* ------------------------------------------------------------------ grades */

export function subjectAverages(grades: GradeEntry[]): SubjectAverage[] {
  const groups = new Map<string, { weighted: number; coefficients: number; classWeighted: number; classCoefficients: number }>()
  for (const grade of grades) {
    const bucket = groups.get(grade.subject) ?? { weighted: 0, coefficients: 0, classWeighted: 0, classCoefficients: 0 }
    const normalised = (grade.score / grade.outOf) * 20
    bucket.weighted += normalised * grade.coefficient
    bucket.coefficients += grade.coefficient
    if (grade.classAverage != null) {
      bucket.classWeighted += grade.classAverage * grade.coefficient
      bucket.classCoefficients += grade.coefficient
    }
    groups.set(grade.subject, bucket)
  }
  return [...groups.entries()].map(([subject, bucket]) => ({
    subject,
    average: bucket.coefficients ? Math.round((bucket.weighted / bucket.coefficients) * 10) / 10 : 0,
    classAverage: bucket.classCoefficients
      ? Math.round((bucket.classWeighted / bucket.classCoefficients) * 10) / 10
      : undefined,
    coefficient: bucket.coefficients,
  }))
}

export function overallAverage(grades: GradeEntry[]): number {
  if (!grades.length) return 0
  const total = grades.reduce((sum, grade) => sum + (grade.score / grade.outOf) * 20 * grade.coefficient, 0)
  const coefficients = grades.reduce((sum, grade) => sum + grade.coefficient, 0)
  return coefficients ? Math.round((total / coefficients) * 10) / 10 : 0
}

/** Bulletins are readable only once published and never when a `records` restriction applies. */
export function bulletinVisible(
  bulletin: Bulletin,
  restrictions: GuardianRestriction[],
  today: string,
): boolean {
  if (!bulletin.publishedAt) return false
  return !restrictionBlocks(restrictions, 'records', today)
}

/* ------------------------------------------------------------------ privacy */

export function maskEmail(email: string | undefined): string {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  if (!domain) return '—'
  const visible = local.slice(0, 1)
  return `${visible}${'•'.repeat(Math.max(3, local.length - 1))}@${domain}`
}

export function maskPhone(phone: string | undefined): string {
  if (!phone) return '—'
  return `${phone.slice(0, 4)}••••${phone.slice(-2)}`
}

/**
 * When a court order forbids address disclosure, the other guardian's contact details are
 * masked — but the school remains reachable and the child's records stay visible.
 */
export function guardianContactFor(
  contact: { name: string; email?: string; phone?: string },
  restrictions: GuardianRestriction[],
  today: string,
): { name: string; email: string; phone: string; masked: boolean } {
  const masked = restrictionBlocks(restrictions, 'address', today)
  return masked
    ? { name: contact.name, email: maskEmail(contact.email), phone: maskPhone(contact.phone), masked: true }
    : { name: contact.name, email: contact.email ?? '—', phone: contact.phone ?? '—', masked: false }
}

/* ------------------------------------------------------------------ invitations */

export function invitationState(
  invitation: GuardianInvitation,
  now: string | Date,
): { usable: boolean; reason: 'ok' | 'expired' | 'used' | 'revoked' | 'locked' } {
  if (invitation.status === 'accepted') return { usable: false, reason: 'used' }
  if (invitation.status === 'revoked') return { usable: false, reason: 'revoked' }
  if (invitation.status === 'locked') return { usable: false, reason: 'locked' }
  const current = now instanceof Date ? now.toISOString() : now
  if (invitation.status === 'expired' || current >= invitation.expiresAt) return { usable: false, reason: 'expired' }
  if (invitation.attempts >= invitation.maxAttempts) return { usable: false, reason: 'locked' }
  return { usable: true, reason: 'ok' }
}

/* ------------------------------------------------------------------ consent */

export function consentIsActive(consent: ConsentProof): boolean {
  return consent.legalBasis === 'consent' ? consent.granted && !consent.withdrawnAt : consent.granted
}

/** Withdrawal takes effect immediately and is always possible for consent-based processing. */
export function canWithdrawConsent(consent: ConsentProof): boolean {
  return consent.legalBasis === 'consent' && consent.granted && !consent.withdrawnAt
}

/* ------------------------------------------------------------------ announcements */

export function visibleAnnouncements(
  announcements: FamilyAnnouncement[],
  childIds: string[],
  restrictions: GuardianRestriction[],
  today: string,
): FamilyAnnouncement[] {
  if (restrictionBlocks(restrictions, 'information', today)) return []
  return announcements.filter(announcement =>
    !announcement.childIds?.length || announcement.childIds.some(id => childIds.includes(id)),
  )
}
