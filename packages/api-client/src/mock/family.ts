/**
 * Stateful family-portal mock. Every handler mirrors an API route in
 * `com.schoolos.family.FamilyController`; the contract test asserts shapes and scoping.
 * The current guardian is always derived from the session, never from the request body.
 */
import type { ApiResponse } from '../client'
import type { Method } from '../http'
import { sessionStore } from '../session-store'
import { getDb, mutateDb } from './db'
import {
  absencePeriodLabel, activeLinks, ageAt, attendanceCounters, canteenCutoff,
  effectiveRestrictions, guardianContactFor, invitationState, isLinkActive,
  restrictionBlocks, safeNotificationText, signState, subjectAverages, overallAverage,
  bulletinVisible, visibleAnnouncements,
} from '@schoolos/shared'
import type {
  AbsenceDeclaration, AbsencePeriod, AppointmentSlot, AuthorizedPerson, Bulletin,
  CanteenReservation, ConcernSubmission, ConsentProof, FamilyActivityEnrolment,
  FamilyAnnouncement, FamilyAttendanceDay, FamilyBillingSummary, FamilyChild,
  FamilyDashboard, FamilyDataRequest, FamilyDocument, FamilyInvoice, FamilyMessage,
  FamilyOverview, FamilyThread, FormAssignment, FormSignature, GuardianRestriction,
  HomeworkItem, NotificationPreferences, PaymentReceipt, SchoolCalendarEvent,
} from '@schoolos/shared'

const ok = <T>(data: T): ApiResponse<T> => ({ data, mock: true })

function fail(status: number, code: string, message: string): never {
  const error = new Error(message) as Error & { status?: number; code?: string }
  error.status = status
  error.code = code
  throw error
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const nowIso = () => new Date().toISOString()

function currentSub(): string {
  const user = sessionStore.get().user
  if (!user) fail(401, 'UNAUTHORIZED', 'Session requise')
  const roles = (user.roles ?? []).map(role => role.toLowerCase())
  if (!roles.some(role => ['guardian', 'guardian2', 'parent'].includes(role))) {
    fail(403, 'FORBIDDEN', 'Espace famille réservé aux responsables légaux')
  }
  return user.sub
}

function currentName(): string {
  return sessionStore.get().user?.name ?? 'Responsable légal'
}

function activeLinksFor(sub: string): ReturnType<typeof activeLinks> {
  return activeLinks(getDb().family.links, todayIso()).filter(link => link.guardianSub === sub)
}

function childIdsFor(sub: string): string[] {
  return [...new Set(activeLinksFor(sub).map(link => link.childId))]
}

function childOr403(sub: string, childId: string): FamilyChild {
  const ids = childIdsFor(sub)
  if (!ids.includes(childId)) fail(403, 'FORBIDDEN', 'Enfant hors de votre périmètre')
  const child = getDb().family.children.find(item => item.id === childId)
  if (!child) fail(404, 'NOT_FOUND', 'Enfant introuvable')
  return child
}

function restrictionsFor(sub: string, childId?: string): GuardianRestriction[] {
  return effectiveRestrictions(
    getDb().family.restrictions.filter(restriction =>
      restriction.guardianSub === sub && (!childId || restriction.childId === childId)),
    todayIso(),
  )
}

function view(child: FamilyChild, sub: string): FamilyChild {
  return { ...child, restrictions: restrictionsFor(sub, child.id) }
}

function optionalChildParam(path: string): string | undefined {
  const query = path.split('?')[1]
  if (!query) return undefined
  return new URLSearchParams(query).get('childId') ?? undefined
}

function childScope(sub: string, path: string): string[] {
  const requested = optionalChildParam(path)
  if (requested) {
    childOr403(sub, requested)
    return [requested]
  }
  return childIdsFor(sub)
}

function assertInformationAllowed(sub: string, childId?: string): void {
  if (restrictionBlocks(restrictionsFor(sub, childId), 'information', todayIso())) {
    fail(403, 'RESTRICTED', 'Accès à l’information restreint par décision de justice')
  }
}

function audit(sub: string, action: string, target: string): void {
  mutateDb(db => {
    db.family.audit.unshift({ id: `fau-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: nowIso(), actorSub: sub, action, target })
  })
}

function notifyOtherGuardians(childId: string, excludeSub: string, action: string): void {
  // Both guardians are informed of shared-data changes; the portal never relays messages.
  const others = activeLinks(outsideLinks(), todayIso())
    .filter(link => link.childId === childId && link.guardianSub !== excludeSub)
  mutateDb(db => {
    for (const link of others) {
      db.family.audit.unshift({
        id: `fau-n-${Date.now()}-${link.guardianSub}`, at: nowIso(), actorSub: 'system',
        action, target: `${childId}:${link.guardianSub}`,
      })
    }
  })
}

function outsideLinks() {
  return getDb().family.links
}

/* ------------------------------------------------------------------ reads */

function buildDashboard(sub: string): FamilyDashboard {
  const db = getDb()
  const childIds = childIdsFor(sub)
  const children = db.family.children.filter(child => childIds.includes(child.id)).map(child => view(child, sub))
  const today = todayIso()
  const dow = (new Date().getUTCDay() + 6) % 7
  const infoBlocked = restrictionBlocks(restrictionsFor(sub), 'information', today)
  const recordsBlocked = restrictionBlocks(restrictionsFor(sub), 'records', today)
  const history = db.family.attendance.filter(day => childIds.includes(day.childId))

  const todayEntries = children.map(child => {
    const entries = infoBlocked ? [] : db.family.timetable.filter(entry => entry.childId === child.id && entry.day === dow)
    return { childId: child.id, entries, changes: entries.filter(entry => !!entry.change) }
  })

  const homeworkDue = infoBlocked ? [] : db.family.homework
    .filter(item => childIds.includes(item.childId) && !item.readAt && item.dueAt >= today)
    .map(item => ({ childId: item.childId, item }))

  const newGrades = recordsBlocked ? [] : db.family.grades
    .filter(grade => childIds.includes(grade.childId) && grade.publishedAt >= addDaysIso(-7))
    .map(grade => ({ childId: grade.childId, grade }))

  const pendingForms = infoBlocked ? [] : db.family.forms
    .filter(form => childIds.includes(form.childId))
    .filter(form => signState(form, sub, db.family.links, restrictionsFor(sub, form.childId), today).allowed)
    .map(form => ({ assignment: form, childId: form.childId }))

  const invoices = db.family.invoices.filter(invoice => invoice.payerSubs.includes(sub) && invoice.status !== 'paid')
  const balanceCents = invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0)

  const upcomingEvents: SchoolCalendarEvent[] = infoBlocked ? [] : db.family.calendar
    .filter(event => event.end >= today)
    .slice(0, 4)

  return {
    children,
    greetingName: currentName(),
    today: todayEntries,
    homeworkDue,
    newGrades,
    unreadMessages: db.family.threads.reduce((sum, thread) => sum + thread.unread, 0),
    pendingForms,
    balanceCents,
    currency: 'EUR',
    upcomingEvents,
    pendingCollectors: db.family.collectors.filter(person => childIds.includes(person.childId) && person.status === 'pending').length,
    restrictions: restrictionsFor(sub),
    requestCount: db.family.dataRequests.filter(request => childIds.includes(request.childId)).length,
  }
}

function addDaysIso(days: number): string {
  const date = new Date(`${todayIso()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------------ handlers */

type Handler = (path: string, method: Method, body: any) => ApiResponse<any> | null

function familyRoutes(): Array<[RegExp, Method[], Handler]> {
  return [
    [/^\/v1\/family\/overview$/, ['GET'], () => {
      const sub = currentSub()
      const db = getDb()
      const ids = childIdsFor(sub)
      const restricted = restrictionBlocks(restrictionsFor(sub), 'information', todayIso())
      return ok<FamilyOverview>({
        guardian: { sub, name: currentName(), email: sessionStore.get().user?.email, secureMessagesOnly: true },
        children: db.family.children.filter(child => ids.includes(child.id)).map(child => view(child, sub)),
        links: db.family.links.filter(link => link.guardianSub === sub),
        policy: db.family.policy,
        invitations: db.family.invitations.filter(invitation => ids.includes(invitation.childId)),
        restrictedDataHidden: restricted,
      })
    }],

    [/^\/v1\/family\/dashboard$/, ['GET'], () => ok(buildDashboard(currentSub()))],

    [/^\/v1\/family\/children$/, ['GET'], () => {
      const sub = currentSub()
      const ids = childIdsFor(sub)
      return ok(getDb().family.children.filter(child => ids.includes(child.id)).map(child => view(child, sub)))
    }],

    [/^\/v1\/family\/children\/([^/]+)\/contact-request$/, ['POST'], (path, _m, body) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      childOr403(sub, id)
      if (!body?.fields || !Object.keys(body.fields).length) fail(400, 'INVALID', 'Aucune modification demandée')
      audit(sub, 'CONTACT_CHANGE_REQUESTED', id)
      notifyOtherGuardians(id, sub, 'CONTACT_CHANGE_NOTIFIED')
      return ok({ submitted: true, requestId: `ccr-${Date.now()}`, approvalQueue: 'accueil', message: 'Modification transmise à l’établissement pour validation.' })
    }],

    [/^\/v1\/family\/children\/([^/]+)$/, ['GET'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      return ok(view(childOr403(sub, id), sub))
    }],

    [/^\/v1\/family\/attendance$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      assertInformationAllowed(sub)
      const db = getDb()
      const days = db.family.attendance.filter(day => ids.includes(day.childId))
      const declarations = db.family.absenceDeclarations.filter(declaration => ids.includes(declaration.childId))
      const counters = ids.map(id => attendanceCounters(days, id, db.family.policy))
      return ok({ days, declarations, counters })
    }],

    [/^\/v1\/family\/absences$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      assertInformationAllowed(sub, childId)
      if (!body?.fromDate || !body?.toDate) fail(400, 'INVALID', 'Dates obligatoires')
      if (String(body.fromDate) > String(body.toDate)) fail(400, 'INVALID', 'La date de fin précède la date de début')
      if (String(body.reasonText ?? '').length > 500) fail(400, 'INVALID', 'Texte limité à 500 caractères')
      const reason = getDb().family.policy.absenceReasons.find(item => item.code === body.reasonCode)
      if (!reason) fail(400, 'INVALID', 'Motif inconnu')
      const declaration: AbsenceDeclaration = {
        id: `abs-${Date.now()}`,
        childId,
        createdBySub: sub,
        createdByName: currentName(),
        fromDate: body.fromDate,
        toDate: body.toDate,
        period: (body.period as AbsencePeriod) ?? 'full_day',
        reasonCode: reason.code,
        reasonLabel: reason.label,
        reasonText: body.reasonText,
        attachmentName: body.attachmentName,
        createdAt: nowIso(),
        status: 'pending',
      }
      mutateDb(db => { db.family.absenceDeclarations.unshift(declaration) })
      audit(sub, 'ABSENCE_DECLARED', declaration.id)
      notifyOtherGuardians(childId, sub, 'ABSENCE_DECLARATION_NOTIFIED')
      return ok(declaration)
    }],

    [/^\/v1\/family\/timetable$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      assertInformationAllowed(sub)
      return ok(getDb().family.timetable.filter(entry => ids.includes(entry.childId)))
    }],

    [/^\/v1\/family\/calendar\/ics$/, ['GET'], (path) => {
      const sub = currentSub()
      const childId = optionalChildParam(path)
      if (childId) childOr403(sub, childId)
      const feed = getDb().family.icsFeeds.find(item => item.childId === (childId ?? childIdsFor(sub)[0]) && !item.revokedAt)
      if (!feed) fail(404, 'NOT_FOUND', 'Aucun abonnement')
      return ok(feed)
    }],

    [/^\/v1\/family\/calendar\/ics$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? childIdsFor(sub)[0] ?? '')
      childOr403(sub, childId)
      const token = `ics-${Math.random().toString(36).slice(2, 10)}`
      const feed = { token, childId, url: `/v1/family/calendar/ics?token=${token}`, createdAt: nowIso(), genericTitles: true as const }
      mutateDb(db => { db.family.icsFeeds.unshift(feed) })
      audit(sub, 'ICS_FEED_CREATED', token)
      return ok(feed)
    }],

    [/^\/v1\/family\/calendar\/ics\/([^/]+)$/, ['DELETE'], (path) => {
      const sub = currentSub()
      const token = path.split('/')[5]
      mutateDb(db => {
        const feed = db.family.icsFeeds.find(item => item.token === token)
        if (feed) feed.revokedAt = nowIso()
      })
      audit(sub, 'ICS_FEED_REVOKED', token)
      return ok({ revoked: true })
    }],

    [/^\/v1\/family\/homework$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      assertInformationAllowed(sub)
      return ok(getDb().family.homework.filter(item => ids.includes(item.childId)))
    }],

    [/^\/v1\/family\/homework\/([^/]+)\/read$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const item = getDb().family.homework.find(entry => entry.id === id)
      if (!item) fail(404, 'NOT_FOUND', 'Devoir introuvable')
      childOr403(sub, item.childId)
      let updated: HomeworkItem | undefined
      mutateDb(db => {
        const found = db.family.homework.find(entry => entry.id === id)
        if (found) { found.readAt = nowIso(); updated = found }
      })
      return ok(updated ?? item)
    }],

    [/^\/v1\/family\/grades$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      assertInformationAllowed(sub)
      const db = getDb()
      const blocked = restrictionBlocks(restrictionsFor(sub), 'records', todayIso())
      const grades = blocked ? [] : db.family.grades.filter(grade => ids.includes(grade.childId))
      const bulletins = db.family.bulletins
        .filter(bulletin => ids.includes(bulletin.childId))
        .filter(bulletin => bulletinVisible(bulletin, restrictionsFor(sub, bulletin.childId), todayIso()))
      return ok({
        grades,
        bulletins,
        averages: subjectAverages(grades),
        overall: overallAverage(grades),
        rankingEnabled: db.family.policy.gradeRankingEnabled,
      })
    }],

    [/^\/v1\/family\/bulletins\/([^/]+)\/acknowledge$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const bulletin = getDb().family.bulletins.find(entry => entry.id === id)
      if (!bulletin) fail(404, 'NOT_FOUND', 'Bulletin introuvable')
      childOr403(sub, bulletin.childId)
      if (restrictionBlocks(restrictionsFor(sub, bulletin.childId), 'records', todayIso())) fail(403, 'RESTRICTED', 'Bulletin indisponible')
      let updated: Bulletin | undefined
      mutateDb(db => {
        const found = db.family.bulletins.find(entry => entry.id === id)
        if (found) {
          found.acknowledgedAt = nowIso()
          found.acknowledgedBy = currentName()
          updated = found
        }
      })
      audit(sub, 'BULLETIN_ACKNOWLEDGED', id)
      return ok(updated ?? bulletin)
    }],

    [/^\/v1\/family\/messages$/, ['GET'], () => {
      const sub = currentSub()
      const childIds = childIdsFor(sub)
      assertInformationAllowed(sub)
      return ok(getDb().family.threads.filter(thread => !thread.childId || childIds.includes(thread.childId)))
    }],

    [/^\/v1\/family\/messages$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = body?.childId ? String(body.childId) : undefined
      if (childId) childOr403(sub, childId)
      const recipientRole = String(body?.recipientRole ?? 'teacher')
      if (!['teacher', 'school_life', 'direction', 'nurse', 'librarian'].includes(recipientRole)) {
        fail(403, 'FORBIDDEN', 'Les messages entre responsables légaux ne sont pas relayés par l’établissement')
      }
      const bodyText = String(body?.body ?? '').trim()
      if (!bodyText) fail(400, 'INVALID', 'Message vide')
      if (bodyText.length > 4000) fail(400, 'INVALID', 'Message trop long')
      const threadId = `th-${Date.now()}`
      const message: FamilyMessage = {
        id: `m-${Date.now()}`, threadId, fromName: currentName(), fromRole: 'guardian',
        body: bodyText, at: nowIso(), attachments: body?.attachmentName
          ? [{ id: `att-${Date.now()}`, name: String(body.attachmentName), kind: 'pdf', scanStatus: 'pending' }]
          : [],
      }
      const thread: FamilyThread = {
        id: threadId, childId,
        subject: String(body?.subject ?? 'Demande à l’établissement'),
        participants: [{ name: currentName(), role: 'guardian' }, { name: recipientRole === 'direction' ? 'Direction' : 'Vie scolaire', role: recipientRole }],
        templateId: body?.templateId,
        messages: [message], unread: 0,
        retentionNotice: 'Messages conservés 3 ans conformément à la politique de l’établissement.',
      }
      mutateDb(db => { db.family.threads.unshift(thread) })
      audit(sub, 'MESSAGE_SENT', threadId)
      return ok(thread)
    }],

    [/^\/v1\/family\/messages\/([^/]+)\/reply$/, ['POST'], (path, _m, body) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const thread = getDb().family.threads.find(item => item.id === id)
      if (!thread) fail(404, 'NOT_FOUND', 'Fil introuvable')
      const text = String(body?.body ?? '').trim()
      if (!text) fail(400, 'INVALID', 'Message vide')
      let updated: FamilyThread | undefined
      mutateDb(db => {
        const found = db.family.threads.find(item => item.id === id)
        if (found) {
          found.messages.push({
            id: `m-${Date.now()}`, threadId: id, fromName: currentName(), fromRole: 'guardian',
            body: text, at: nowIso(), attachments: [], readAt: undefined,
          })
          if (found.officeHoursAutoReply) found.unread += 0
          updated = found
        }
      })
      audit(sub, 'MESSAGE_SENT', id)
      return ok(updated ?? thread)
    }],

    [/^\/v1\/family\/messages\/([^/]+)\/read$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      mutateDb(db => {
        const thread = db.family.threads.find(item => item.id === id)
        if (thread) {
          thread.unread = 0
          thread.messages.forEach(message => { if (!message.readAt) message.readAt = nowIso() })
        }
      })
      return ok({ read: true, by: sub })
    }],

    [/^\/v1\/family\/messages\/([^/]+)\/abuse$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      mutateDb(db => {
        const thread = db.family.threads.find(item => item.id === id)
        if (thread) thread.abuseReportedAt = nowIso()
      })
      audit(sub, 'MESSAGE_ABUSE_REPORTED', id)
      return ok({ reported: true })
    }],

    [/^\/v1\/family\/announcements$/, ['GET'], () => {
      const sub = currentSub()
      assertInformationAllowed(sub)
      const ids = childIdsFor(sub)
      return ok(visibleAnnouncements(getDb().family.announcements, ids, restrictionsFor(sub), todayIso()))
    }],

    [/^\/v1\/family\/announcements\/([^/]+)\/read$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      let updated: FamilyAnnouncement | undefined
      mutateDb(db => {
        const announcement = db.family.announcements.find(item => item.id === id)
        if (announcement) { announcement.readAt = nowIso(); updated = announcement }
      })
      if (!updated) fail(404, 'NOT_FOUND', 'Annonce introuvable')
      return ok(updated)
    }],

    [/^\/v1\/family\/calendar$/, ['GET'], () => {
      const sub = currentSub()
      assertInformationAllowed(sub)
      return ok(getDb().family.calendar)
    }],

    [/^\/v1\/family\/forms$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      assertInformationAllowed(sub)
      return ok(getDb().family.forms.filter(form => ids.includes(form.childId)))
    }],

    [/^\/v1\/family\/forms\/([^/]+)\/sign$/, ['POST'], (path, _m, body) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const assignment = getDb().family.forms.find(form => form.id === id)
      if (!assignment) fail(404, 'NOT_FOUND', 'Formulaire introuvable')
      childOr403(sub, assignment.childId)
      if (assignment.formType === 'image_rights' && restrictionBlocks(restrictionsFor(sub, assignment.childId), 'media', todayIso())) {
        fail(403, 'RESTRICTED', 'Droit à l’image restreint par décision de justice')
      }
      const state = signState(assignment, sub, getDb().family.links, restrictionsFor(sub, assignment.childId), todayIso())
      if (!state.allowed) fail(403, 'FORBIDDEN', `Signature impossible : ${state.reason}`)
      if (!sessionStore.get().user) fail(401, 'UNAUTHORIZED', 'Session requise')
      const signature: FormSignature = {
        id: `sig-${Date.now()}`,
        signerSub: sub,
        signerName: currentName(),
        signedAt: nowIso(),
        documentHash: `sha256:${id}-${assignment.templateId}`,
        ipHash: `hmac:${Math.random().toString(36).slice(2, 10)}`,
        device: String(body?.device ?? 'Navigateur web'),
        method: body?.method === 'mfa' ? 'mfa' : 'password',
        proofLabel: 'Signature simple — identité de session',
      }
      let updated: FormAssignment | undefined
      mutateDb(db => {
        const form = db.family.forms.find(item => item.id === id)
        if (!form) return
        form.signatures.push(signature)
        const signed = form.signatures.map(item => item.signerSub)
        form.status = form.signatoryRule === 'one_guardian' || form.requiredSignerSubs.every(item => signed.includes(item))
          ? 'signed'
          : 'partially_signed'
        updated = form
      })
      audit(sub, 'FORM_SIGNED', id)
      notifyOtherGuardians(assignment.childId, sub, 'FORM_SIGNATURE_NOTIFIED')
      return ok({ assignment: updated ?? assignment, state })
    }],

    [/^\/v1\/family\/forms\/([^/]+)\/withdraw$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const assignment = getDb().family.forms.find(form => form.id === id)
      if (!assignment) fail(404, 'NOT_FOUND', 'Formulaire introuvable')
      childOr403(sub, assignment.childId)
      if (!assignment.withdrawable) fail(403, 'FORBIDDEN', 'Ce document ne peut pas être retiré')
      let updated: FormAssignment | undefined
      mutateDb(db => {
        const form = db.family.forms.find(item => item.id === id)
        if (form) {
          form.status = 'withdrawn'
          form.signatures = form.signatures.filter(signature => signature.signerSub !== sub)
          updated = form
        }
      })
      audit(sub, 'FORM_WITHDRAWN', id)
      notifyOtherGuardians(assignment.childId, sub, 'FORM_WITHDRAWAL_NOTIFIED')
      return ok(updated ?? assignment)
    }],

    [/^\/v1\/family\/collectors$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      return ok(getDb().family.collectors.filter(person => ids.includes(person.childId)))
    }],

    [/^\/v1\/family\/collectors$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      if (restrictionBlocks(restrictionsFor(sub, childId), 'collection', todayIso())) {
        fail(403, 'RESTRICTED', 'Ajout de personne autorisée impossible : restriction en vigueur')
      }
      if (!body?.name || !body?.relationship || !body?.phone) fail(400, 'INVALID', 'Nom, lien et téléphone obligatoires')
      const person: AuthorizedPerson = {
        id: `ap-${Date.now()}`, childId,
        name: String(body.name), relationship: String(body.relationship), phone: String(body.phone),
        idCheckRequired: body.idCheckRequired !== false,
        validFrom: String(body.validFrom ?? todayIso()), validTo: body.validTo,
        status: 'pending', createdBySub: sub, createdByName: currentName(),
        createdAt: nowIso(), note: body.note,
      }
      mutateDb(db => { db.family.collectors.unshift(person) })
      audit(sub, 'COLLECTOR_ADDED', person.id)
      notifyOtherGuardians(childId, sub, 'COLLECTOR_CHANGE_NOTIFIED')
      return ok(person)
    }],

    [/^\/v1\/family\/collectors\/([^/]+)$/, ['PATCH'], (path, _m, body) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const person = getDb().family.collectors.find(item => item.id === id)
      if (!person) fail(404, 'NOT_FOUND', 'Personne introuvable')
      childOr403(sub, person.childId)
      if (person.status === 'approved') fail(409, 'LOCKED', 'Une personne approuvée doit être modifiée par l’établissement')
      mutateDb(db => {
        const found = db.family.collectors.find(item => item.id === id)
        if (!found) return
        if (body?.name != null) found.name = String(body.name)
        if (body?.phone != null) found.phone = String(body.phone)
        if (body?.validTo != null) found.validTo = body.validTo
        found.status = 'pending'
      })
      audit(sub, 'COLLECTOR_UPDATED', id)
      notifyOtherGuardians(person.childId, sub, 'COLLECTOR_CHANGE_NOTIFIED')
      return ok(getDb().family.collectors.find(item => item.id === id))
    }],

    [/^\/v1\/family\/collectors\/([^/]+)$/, ['DELETE'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const person = getDb().family.collectors.find(item => item.id === id)
      if (!person) fail(404, 'NOT_FOUND', 'Personne introuvable')
      childOr403(sub, person.childId)
      if (person.status === 'approved') fail(409, 'LOCKED', 'Une personne approuvée ne peut être retirée que par l’établissement')
      mutateDb(db => { db.family.collectors = db.family.collectors.filter(item => item.id !== id) })
      audit(sub, 'COLLECTOR_REMOVED', id)
      notifyOtherGuardians(person.childId, sub, 'COLLECTOR_CHANGE_NOTIFIED')
      return ok({ deleted: true })
    }],

    [/^\/v1\/family\/appointments$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      return ok(getDb().family.slots.filter(slot => ids.includes(slot.childId)))
    }],

    [/^\/v1\/family\/appointments\/([^/]+)\/book$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const slot = getDb().family.slots.find(item => item.id === id)
      if (!slot) fail(404, 'NOT_FOUND', 'Créneau introuvable')
      childOr403(sub, slot.childId)
      if (slot.bookedBy) fail(409, 'CONFLICT', 'Ce créneau est déjà réservé')
      // Conflict detection: one family cannot hold two appointments at the same time.
      const conflict = getDb().family.slots.find(item =>
        item.bookedBy === sub && (item.bookedBy === sub) && item.date === slot.date && item.start === slot.start)
      if (conflict) fail(409, 'CONFLICT', 'Un rendez-vous existe déjà sur ce créneau')
      mutateDb(db => {
        const found = db.family.slots.find(item => item.id === id)
        if (found) { found.bookedBy = sub; found.bookedByName = currentName() }
      })
      audit(sub, 'APPOINTMENT_BOOKED', id)
      return ok(getDb().family.slots.find(item => item.id === id) ?? slot)
    }],

    [/^\/v1\/family\/appointments\/([^/]+)\/cancel$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const slot = getDb().family.slots.find(item => item.id === id)
      if (!slot) fail(404, 'NOT_FOUND', 'Créneau introuvable')
      childOr403(sub, slot.childId)
      if (slot.bookedBy !== sub) fail(403, 'FORBIDDEN', 'Ce rendez-vous n’est pas le vôtre')
      mutateDb(db => {
        const found = db.family.slots.find(item => item.id === id)
        if (found) { found.bookedBy = undefined; found.bookedByName = undefined }
      })
      audit(sub, 'APPOINTMENT_CANCELLED', id)
      return ok(getDb().family.slots.find(item => item.id === id) ?? slot)
    }],

    [/^\/v1\/family\/activities$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      const db = getDb()
      return ok({
        offerings: db.offerings,
        activities: db.activities,
        enrolments: db.family.enrolments.filter(enrolment => ids.includes(enrolment.childId)),
      })
    }],

    [/^\/v1\/family\/activities\/enrol$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      const offering = getDb().offerings.find(item => item.id === body?.offeringId)
      if (!offering) fail(404, 'NOT_FOUND', 'Offre introuvable')
      if (offering.status === 'closed') fail(409, 'CLOSED', 'Les inscriptions sont fermées')
      const existing = getDb().family.enrolments.find(item => item.childId === childId && item.offeringId === offering.id)
      if (existing) fail(409, 'CONFLICT', 'Déjà inscrit ou en liste d’attente')
      const activity = getDb().activities.find(item => item.id === offering.activityId)
      const waitlisted = offering.booked >= offering.capacity
      const enrolment: FamilyActivityEnrolment = {
        id: `en-${Date.now()}`, childId, offeringId: offering.id,
        activityName: activity?.name ?? 'Activité', status: waitlisted ? 'waitlisted' : 'confirmed',
        waitlistPosition: waitlisted ? offering.waitlist + 1 : undefined,
        enrolledAt: nowIso(), feeCents: offering.priceCents, currency: offering.currency,
        consentRequired: true, consentGranted: !!body?.consent,
      }
      mutateDb(db => {
        db.family.enrolments.unshift(enrolment)
        const target = db.offerings.find(item => item.id === offering.id)
        if (target) {
          if (waitlisted) target.waitlist += 1
          else { target.booked += 1; if (target.booked >= target.capacity) target.status = 'full' }
        }
      })
      audit(sub, waitlisted ? 'ACTIVITY_WAITLISTED' : 'ACTIVITY_ENROLLED', enrolment.id)
      return ok(enrolment)
    }],

    [/^\/v1\/family\/activities\/enrolments\/([^/]+)\/cancel$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[5]
      const enrolment = getDb().family.enrolments.find(item => item.id === id)
      if (!enrolment) fail(404, 'NOT_FOUND', 'Inscription introuvable')
      childOr403(sub, enrolment.childId)
      mutateDb(db => {
        const found = db.family.enrolments.find(item => item.id === id)
        if (found) found.status = 'cancelled'
        const offering = db.offerings.find(item => item.id === enrolment.offeringId)
        if (offering) {
          if (enrolment.status === 'waitlisted') offering.waitlist = Math.max(0, offering.waitlist - 1)
          else offering.booked = Math.max(0, offering.booked - 1)
          if (offering.booked < offering.capacity) offering.status = 'open'
        }
      })
      audit(sub, 'ACTIVITY_CANCELLED', id)
      return ok(getDb().family.enrolments.find(item => item.id === id))
    }],

    [/^\/v1\/family\/canteen$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      const db = getDb()
      return ok({
        mode: db.family.policy.canteenMode,
        menus: db.family.menus,
        reservations: db.family.reservations.filter(reservation => ids.includes(reservation.childId)),
      })
    }],

    [/^\/v1\/family\/canteen\/reserve$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      if (getDb().family.policy.canteenMode === 'commune') fail(409, 'COMMUNE', 'La restauration est gérée par la commune')
      const date = String(body?.date ?? '')
      if (!date) fail(400, 'INVALID', 'Date obligatoire')
      const cutoff = canteenCutoff(date, new Date())
      if (!cutoff.open) fail(409, 'CUTOFF', `Réservation fermée (date limite ${cutoff.cutoffAt})`)
      const reservation: CanteenReservation = {
        id: `cr-${Date.now()}`, childId, date, status: 'reserved', cutoffAt: cutoff.cutoffAt, billed: false,
      }
      mutateDb(db => { db.family.reservations.unshift(reservation) })
      audit(sub, 'CANTEEN_RESERVED', reservation.id)
      return ok(reservation)
    }],

    [/^\/v1\/family\/canteen\/reservations\/([^/]+)$/, ['DELETE'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[5]
      const reservation = getDb().family.reservations.find(item => item.id === id)
      if (!reservation) fail(404, 'NOT_FOUND', 'Réservation introuvable')
      childOr403(sub, reservation.childId)
      const cutoff = canteenCutoff(reservation.date, new Date())
      if (!cutoff.open) fail(409, 'CUTOFF', 'Annulation impossible après la date limite')
      mutateDb(db => {
        const found = db.family.reservations.find(item => item.id === id)
        if (found) found.status = 'cancelled'
      })
      audit(sub, 'CANTEEN_CANCELLED', id)
      return ok(getDb().family.reservations.find(item => item.id === id))
    }],

    [/^\/v1\/family\/billing$/, ['GET'], () => {
      const sub = currentSub()
      const invoices = getDb().family.invoices.filter(invoice => invoice.payerSubs.includes(sub))
      const balanceCents = invoices.filter(invoice => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.amountCents, 0)
      const due = invoices.filter(invoice => invoice.status !== 'paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      return ok<FamilyBillingSummary>({
        balanceCents, currency: 'EUR', dueCount: due.length, nextDueDate: due[0]?.dueDate,
        invoices,
        payerVisibility: getDb().family.invoices.some(invoice => invoice.payerSubs.length > 1)
          ? 'Facturation partagée' : 'Facturation séparée — chaque payeur ne voit que ses factures',
        mandate: undefined,
      })
    }],

    [/^\/v1\/family\/billing\/invoices\/([^/]+)\/pay$/, ['POST'], (path, _m, body) => {
      const sub = currentSub()
      const id = path.split('/')[5]
      const invoice = getDb().family.invoices.find(item => item.id === id)
      if (!invoice) fail(404, 'NOT_FOUND', 'Facture introuvable')
      if (!invoice.payerSubs.includes(sub)) fail(403, 'FORBIDDEN', 'Facture hors de votre périmètre')
      if (invoice.status === 'paid') fail(409, 'CONFLICT', 'Facture déjà réglée')
      const stepUp = (sessionStore.get().user?.stepUpUntil ?? 0) > Date.now()
      if (!stepUp) fail(403, 'STEP_UP_REQUIRED', 'Authentification renforcée requise pour payer')
      const receipt: PaymentReceipt = {
        id: `rcpt-${Date.now()}`, invoiceId: id, amountCents: invoice.amountCents, currency: invoice.currency,
        paidAt: nowIso(), method: body?.method === 'sepa' ? 'sepa' : 'card',
        pspReference: `psp_${Math.random().toString(36).slice(2, 10)}`,
        receiptName: `recu-${id}.pdf`, stepUpUsed: true,
      }
      mutateDb(db => {
        const found = db.family.invoices.find(item => item.id === id)
        if (found) found.status = 'paid'
        db.family.receipts.unshift(receipt)
      })
      audit(sub, 'INVOICE_PAID', id)
      return ok(receipt)
    }],

    [/^\/v1\/family\/billing\/mandate$/, ['POST'], () => {
      const sub = currentSub()
      audit(sub, 'SEPA_MANDATE_REQUESTED', 'mandate')
      return ok({ id: 'mandate-1', ibanMasked: 'FR76 •••• •••• 4210', status: 'pending', signedAt: nowIso() })
    }],

    [/^\/v1\/family\/documents$/, ['GET'], (path) => {
      const sub = currentSub()
      const ids = childScope(sub, path)
      return ok(getDb().family.documents.filter(document => ids.includes(document.childId)))
    }],

    [/^\/v1\/family\/documents\/request$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      const doc: FamilyDocument = {
        id: `doc-${Date.now()}`, childId, type: body?.type ?? 'certificat_scolarite',
        title: String(body?.title ?? 'Certificat de scolarité'), status: 'requested',
        requestedAt: todayIso(), requiresApproval: true,
      }
      mutateDb(db => { db.family.documents.unshift(doc) })
      audit(sub, 'DOCUMENT_REQUESTED', doc.id)
      return ok(doc)
    }],

    [/^\/v1\/family\/documents\/downloads$/, ['GET'], () => {
      const sub = currentSub()
      const ids = childIdsFor(sub)
      return ok(getDb().family.downloads.filter(download => ids.includes(download.childId)))
    }],

    [/^\/v1\/family\/documents\/([^/]+)\/download$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const document = getDb().family.documents.find(item => item.id === id)
      if (!document) fail(404, 'NOT_FOUND', 'Document introuvable')
      const child = childOr403(sub, document.childId)
      if (document.status !== 'available') fail(409, 'NOT_READY', 'Document non disponible')
      if (restrictionBlocks(restrictionsFor(sub, document.childId), 'records', todayIso())) {
        fail(403, 'RESTRICTED', 'Téléchargement restreint')
      }
      const download = {
        id: `dl-${Date.now()}`, documentId: document.id, documentTitle: document.title,
        childId: document.childId, downloadedAt: nowIso(),
        watermark: `${child.firstName} ${child.lastName} · ${currentName()} · ${todayIso()}`,
        ipHash: `hmac:${Math.random().toString(36).slice(2, 10)}`,
      }
      mutateDb(db => { db.family.downloads.unshift(download) })
      audit(sub, 'DOCUMENT_DOWNLOADED', document.id)
      return ok({ download, url: document.downloadUrl ?? `/v1/family/documents/${document.id}/file?token=mock` })
    }],

    [/^\/v1\/family\/preferences$/, ['GET'], () => ok(getDb().family.preferences)],

    [/^\/v1\/family\/preferences$/, ['PUT'], (_path, _m, body) => {
      const sub = currentSub()
      let next = getDb().family.preferences
      if (body && typeof body === 'object') {
        next = {
          ...next,
          ...body,
          // Mandatory notices can never be muted or removed from in-app delivery.
          items: (body.items ?? next.items).map((item: any) => item.mandatory ? { ...item, inApp: true } : item),
          pushContentFree: true,
        }
      }
      mutateDb(db => { db.family.preferences = next })
      audit(sub, 'PREFERENCES_UPDATED', 'notification-preferences')
      return ok(next)
    }],

    [/^\/v1\/family\/devices$/, ['GET'], () => ok(getDb().family.devices)],

    [/^\/v1\/family\/devices\/([^/]+)\/revoke$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const device = getDb().family.devices.find(item => item.id === id)
      if (!device) fail(404, 'NOT_FOUND', 'Appareil introuvable')
      if (device.current) fail(400, 'CURRENT_DEVICE', 'Impossible de révoquer la session courante')
      mutateDb(db => { db.family.devices = db.family.devices.filter(item => item.id !== id) })
      audit(sub, 'DEVICE_REVOKED', id)
      return ok({ revoked: true })
    }],

    [/^\/v1\/family\/data-requests$/, ['GET'], () => {
      const sub = currentSub()
      const ids = childIdsFor(sub)
      return ok(getDb().family.dataRequests.filter(request => ids.includes(request.childId)))
    }],

    [/^\/v1\/family\/data-requests$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      const type = String(body?.type ?? 'access')
      const request: FamilyDataRequest = {
        id: `dr-${Date.now()}`, type: type as FamilyDataRequest['type'], childId,
        subject: String(body?.subject ?? ''), requestedAt: todayIso(), status: 'received',
        dueAt: addDaysIso(30),
        legalExceptions: [
          'Les données dont la conservation est imposée par la loi ne peuvent pas être effacées.',
          'Les notes et bulletins sont conservés selon la durée réglementaire.',
        ],
      }
      mutateDb(db => { db.family.dataRequests.unshift(request) })
      audit(sub, 'DATA_REQUEST_CREATED', request.id)
      return ok(request)
    }],

    [/^\/v1\/family\/consents$/, ['GET'], () => {
      const sub = currentSub()
      const ids = childIdsFor(sub)
      return ok(getDb().family.consents.filter(consent => ids.includes(consent.childId)))
    }],

    [/^\/v1\/family\/consents\/([^/]+)\/withdraw$/, ['POST'], (path) => {
      const sub = currentSub()
      const id = path.split('/')[4]
      const consent = getDb().family.consents.find(item => item.id === id)
      if (!consent) fail(404, 'NOT_FOUND', 'Consentement introuvable')
      childOr403(sub, consent.childId)
      if (consent.legalBasis !== 'consent') fail(409, 'NOT_CONSENT', 'Ce traitement ne repose pas sur le consentement')
      let updated: ConsentProof | undefined
      mutateDb(db => {
        const found = db.family.consents.find(item => item.id === id)
        if (found) { found.withdrawnAt = nowIso(); found.granted = false; updated = found }
      })
      audit(sub, 'CONSENT_WITHDRAWN', id)
      return ok(updated ?? consent)
    }],

    [/^\/v1\/family\/policy$/, ['GET'], () => ok(getDb().family.policy)],

    [/^\/v1\/family\/concerns$/, ['POST'], (_path, _m, body) => {
      const sub = currentSub()
      const childId = String(body?.childId ?? '')
      childOr403(sub, childId)
      if (!body?.message || String(body.message).trim().length < 10) fail(400, 'INVALID', 'Décrivez brièvement la situation')
      const submission: ConcernSubmission = {
        id: `concern-${Date.now()}`,
        reference: `FAM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        submittedAt: nowIso(),
        routedTo: ['direction', 'safeguarding'],
        message: 'Votre signalement a été transmis à la direction et au référent protection de l’enfance.',
      }
      // Write-only: the content is deliberately not returned or exposed by any read endpoint.
      mutateDb(db => { db.family.concerns.unshift({ ...submission, message: String(body.message) }) })
      audit(sub, 'CONCERN_REPORTED', submission.reference)
      return ok(submission)
    }],

    [/^\/v1\/family\/guardian-contact$/, ['GET'], (path) => {
      const sub = currentSub()
      const childId = optionalChildParam(path)
      if (!childId) fail(400, 'INVALID', 'childId obligatoire')
      childOr403(sub, childId)
      const other = getDb().family.links.find(link => link.childId === childId && link.guardianSub !== sub && isLinkActive(link, todayIso()))
      if (!other) return ok(null)
      return ok(guardianContactFor({ name: other.guardianName, email: other.guardianEmail }, restrictionsFor(sub, childId), todayIso()))
    }],

    [/^\/v1\/family\/invitations$/, ['GET'], () => {
      const sub = currentSub()
      const ids = childIdsFor(sub)
      return ok(getDb().family.invitations
        .filter(invitation => ids.includes(invitation.childId))
        .map(invitation => ({ ...invitation, state: invitationState(invitation, new Date()) })))
    }],
  ]
}

export { familyRoutes }
