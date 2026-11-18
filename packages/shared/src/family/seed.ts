/**
 * Demo seed for the guardian portal. The shapes are identical to the API DTOs, so the
 * stateful mock and the real service can be contract-tested against the same fixture.
 *
 * Demo scenario (docs/DEMO_ACCOUNTS.md):
 *  - Famille Martin (`demo-guardian`, Camille Martin) — Léa (MS A) and Tom (CP A)
 *  - Alex Moreau (`demo-guardian-2`) — second parent of Tom, separated household,
 *    court-order restrictions (`collect_child`, `media`)
 *  - Famille Petit (`demo-guardian-petit`, no login shown on the demo screen) — two
 *    children in different classes, used for IDOR tests.
 */
import type {
  AbsenceDeclaration, AppointmentSlot, AuthorizedPerson, Bulletin, CanteenMenuItem,
  CanteenReservation, ConcernSubmission, ConsentProof, DeviceSession, DocumentDownload,
  FamilyActivityEnrolment, FamilyAnnouncement, FamilyAttendanceDay, FamilyChild,
  FamilyDataRequest, FamilyDocument, FamilyInvoice, FamilyMessage, FamilyPolicy,
  FamilyThread, FamilyTimetableEntry, FormAssignment, GradeEntry, GuardianInvitation,
  GuardianLink, GuardianRestriction, HomeworkItem, IcsFeed, NotificationPreferences,
  PaymentReceipt, SchoolCalendarEvent,
} from './types'
import { addDays, DEFAULT_SIGNATORY_RULES, isoDay } from './policy'

export interface FamilyData {
  links: GuardianLink[]
  restrictions: GuardianRestriction[]
  children: FamilyChild[]
  invitations: GuardianInvitation[]
  attendance: FamilyAttendanceDay[]
  absenceDeclarations: AbsenceDeclaration[]
  timetable: FamilyTimetableEntry[]
  icsFeeds: IcsFeed[]
  homework: HomeworkItem[]
  grades: GradeEntry[]
  bulletins: Bulletin[]
  threads: FamilyThread[]
  announcements: FamilyAnnouncement[]
  calendar: SchoolCalendarEvent[]
  forms: FormAssignment[]
  consents: ConsentProof[]
  collectors: AuthorizedPerson[]
  slots: AppointmentSlot[]
  enrolments: FamilyActivityEnrolment[]
  invoices: FamilyInvoice[]
  receipts: PaymentReceipt[]
  menus: CanteenMenuItem[]
  reservations: CanteenReservation[]
  documents: FamilyDocument[]
  downloads: DocumentDownload[]
  preferences: NotificationPreferences
  devices: DeviceSession[]
  dataRequests: FamilyDataRequest[]
  concerns: ConcernSubmission[]
  policy: FamilyPolicy
  audit: { id: string; at: string; actorSub: string; action: string; target: string }[]
}

const SCHOOL = '11111111-1111-4111-8111-111111111111'
const LEGAL = 'TODO(legal-review)'

export const FAMILY_POLICY: FamilyPolicy = {
  // Verify with legal counsel: at 18 the default keeps reading blocked until the pupil consents.
  agePolicy: 'require_student_consent',
  canteenMode: 'school',
  gradeRankingEnabled: false,
  bothGuardiansMeetingDefault: true,
  officeHours: {
    start: '08:00',
    end: '17:00',
    timezone: 'Europe/Paris',
    autoReply: 'Nous avons bien reçu votre message. L’équipe y répondra pendant les horaires d’ouverture (8h–17h).',
  },
  quietHours: { start: '18:00', end: '08:00', digestOnly: true },
  mandatoryNoticeChannels: ['in_app', 'email'],
  signatoryRules: { ...DEFAULT_SIGNATORY_RULES },
  absenceReasons: [
    { code: 'illness', label: 'Maladie' },
    { code: 'medical', label: 'Rendez-vous médical' },
    { code: 'family', label: 'Raison familiale' },
    { code: 'transport', label: 'Problème de transport' },
    { code: 'other', label: 'Autre motif' },
  ],
  absenceThresholds: { unjustified: 4, late: 3, label: 'Seuil d’alerte défini par l’établissement (informatif)' },
  signatureNotice:
    'En signant, vous attestez avoir pris connaissance du document. ' +
    'La valeur probante de la signature électronique est définie par l’établissement. ' + LEGAL,
}

const SCHOOL_LIFE = {
  name: 'Nora Benali',
  role: 'Vie scolaire',
  email: 'vie-scolaire@saint-denis.edu.fr',
  phone: '01 48 20 33 10',
}

const CHILDREN: FamilyChild[] = [
  {
    id: 'stu-1', firstName: 'Léa', lastName: 'Martin', schoolId: SCHOOL,
    className: 'Moyenne Section A', level: 'MS', birthDate: '2021-03-14',
    teachers: [
      { name: 'Amélie Roux', subject: 'Enseignante principale', email: 'a.roux@saint-denis.edu.fr', officeHours: 'Mardi 16h30–17h30' },
      { name: 'Yanis Petit', subject: 'ATSEM', email: 'y.petit@saint-denis.edu.fr' },
    ],
    schoolLifeContact: SCHOOL_LIFE, restrictions: [], mayCollectChild: true, photoConsentGranted: true,
  },
  {
    id: 'stu-2', firstName: 'Tom', lastName: 'Martin', schoolId: SCHOOL,
    className: 'CP A', level: 'CP', birthDate: '2019-06-02',
    teachers: [
      { name: 'Élise Martin', subject: 'Enseignante principale', email: 'e.martin@saint-denis.edu.fr', officeHours: 'Jeudi 17h–18h' },
      { name: 'Laura Perrin', subject: 'Soutien lecture', email: 'l.perrin@saint-denis.edu.fr' },
    ],
    schoolLifeContact: SCHOOL_LIFE, restrictions: [], mayCollectChild: true, photoConsentGranted: true,
  },
  {
    id: 'stu-5', firstName: 'Jade', lastName: 'Petit', schoolId: SCHOOL,
    className: 'CM1 A', level: 'CM1', birthDate: '2016-01-22',
    teachers: [{ name: 'Julien Petit', subject: 'Enseignant principal', email: 'j.petit@saint-denis.edu.fr' }],
    schoolLifeContact: SCHOOL_LIFE, restrictions: [], mayCollectChild: true, photoConsentGranted: true,
  },
  {
    id: 'stu-9', firstName: 'Chloé', lastName: 'Leroy', schoolId: SCHOOL,
    className: 'CM2 B', level: 'CM2', birthDate: '2015-09-11',
    teachers: [{ name: 'Nora Benali', subject: 'Enseignante principale', email: 'n.benali@saint-denis.edu.fr' }],
    schoolLifeContact: SCHOOL_LIFE, restrictions: [], mayCollectChild: true, photoConsentGranted: false,
  },
]

const SUBJECTS_CP = [
  ['Lecture', 'Élise Martin', 'Salle 08'],
  ['Mathématiques', 'Élise Martin', 'Salle 08'],
  ['Écriture', 'Élise Martin', 'Salle 08'],
  ['Questionner le monde', 'Laura Perrin', 'Salle 12'],
  ['Arts plastiques', 'Amélie Roux', 'Atelier 2'],
  ['Éducation physique', 'Yanis Petit', 'Gymnase'],
]

export function makeFamilyData(now: Date = new Date()): FamilyData {
  const today = isoDay(now)
  // Legal week start (Monday) so the timetable/ICS views are stable.
  const weekday = (now.getUTCDay() + 6) % 7
  const monday = addDays(today, -weekday)

  const links: GuardianLink[] = [
    {
      id: 'gl-1', guardianSub: 'demo-guardian', guardianName: 'Camille Martin', guardianEmail: 'famille.martin@example.fr',
      childId: 'stu-1', relationship: 'mother', holdsParentalAuthority: true, rightToInformation: true,
      isFinancialPayer: true, isEmergencyContact: true, emergencyPriority: 1, mayCollectChild: true,
      livesWithChild: true, status: 'active', validFrom: '2024-09-01',
    },
    {
      id: 'gl-2', guardianSub: 'demo-guardian', guardianName: 'Camille Martin', guardianEmail: 'famille.martin@example.fr',
      childId: 'stu-2', relationship: 'mother', holdsParentalAuthority: true, rightToInformation: true,
      isFinancialPayer: true, isEmergencyContact: true, emergencyPriority: 1, mayCollectChild: true,
      livesWithChild: true, status: 'active', validFrom: '2024-09-01',
    },
    {
      id: 'gl-3', guardianSub: 'demo-guardian-2', guardianName: 'Alex Moreau', guardianEmail: 'alex.moreau@example.fr',
      childId: 'stu-2', relationship: 'father', holdsParentalAuthority: true, rightToInformation: true,
      isFinancialPayer: false, isEmergencyContact: true, emergencyPriority: 2, mayCollectChild: true,
      livesWithChild: false, status: 'active', validFrom: '2024-09-01',
    },
    {
      id: 'gl-4', guardianSub: 'demo-guardian-petit', guardianName: 'Sophie Petit', guardianEmail: 's.petit@example.fr',
      childId: 'stu-5', relationship: 'mother', holdsParentalAuthority: true, rightToInformation: true,
      isFinancialPayer: true, isEmergencyContact: true, emergencyPriority: 1, mayCollectChild: true,
      livesWithChild: true, status: 'active', validFrom: '2024-09-01',
    },
    {
      id: 'gl-5', guardianSub: 'demo-guardian-petit', guardianName: 'Sophie Petit', guardianEmail: 's.petit@example.fr',
      childId: 'stu-9', relationship: 'mother', holdsParentalAuthority: true, rightToInformation: true,
      isFinancialPayer: true, isEmergencyContact: true, emergencyPriority: 1, mayCollectChild: true,
      livesWithChild: true, status: 'active', validFrom: '2024-09-01',
    },
  ]

  const restrictions: GuardianRestriction[] = [
    {
      id: 'gr-1', childId: 'stu-2', guardianSub: 'demo-guardian-2', type: 'collect_child',
      scope: 'Sortie de classe et accueil périscolaire', courtDocumentRef: 'TJ-2025-441',
      courtDocumentName: 'Ordonnance de mesures provisoires.pdf', setBy: 'Camille Durand',
      effectiveFrom: '2025-09-01', active: true,
      note: 'Retrait de l’enfant assuré par la mère ou une personne autorisée.',
    },
    {
      id: 'gr-2', childId: 'stu-2', guardianSub: 'demo-guardian-2', type: 'media',
      scope: 'Photographies publiées par l’école', courtDocumentRef: 'TJ-2025-441',
      courtDocumentName: 'Ordonnance de mesures provisoires.pdf', setBy: 'Camille Durand',
      effectiveFrom: '2025-09-01', active: true,
    },
  ]

  // Restrictions are injected per requesting guardian by the API/mock, never shared across parents.
  const children = CHILDREN.map(child => ({ ...child, restrictions: [] }))

  const invitations: GuardianInvitation[] = [
    {
      id: 'inv-pending', childId: 'stu-1', childName: 'Léa Martin', invitedName: 'Claire Martin',
      invitedEmail: 'claire.martin@example.fr', relationship: 'other', codeHint: '••••4K2D',
      status: 'pending', sentAt: '2026-11-16T09:00:00Z', expiresAt: '2026-11-23T09:00:00Z',
      attempts: 0, maxAttempts: 5, verification: { requiresBirthDate: true, requiresIne: true },
    },
    {
      id: 'inv-expired', childId: 'stu-2', childName: 'Tom Martin', invitedName: 'Alex Moreau',
      invitedEmail: 'alex.moreau@example.fr', relationship: 'father', codeHint: '••••9Z1Q',
      status: 'expired', sentAt: '2026-10-01T09:00:00Z', expiresAt: '2026-10-08T09:00:00Z',
      attempts: 1, maxAttempts: 5, verification: { requiresBirthDate: true, requiresIne: true },
    },
  ]

  // Attendance: last 20 school days, with one unjustified absence and one justified lateness.
  const attendance: FamilyAttendanceDay[] = []
  for (const child of ['stu-1', 'stu-2', 'stu-5', 'stu-9']) {
    for (let i = 0; i < 20; i += 1) {
      const date = addDays(today, -i)
      const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
      if (dow === 0 || dow === 6) continue
      const absent = child === 'stu-2' && i === 2
      const justified = child === 'stu-2' && i === 7
      const late = child === 'stu-2' && i === 4
      attendance.push({
        date, childId: child,
        status: absent || justified ? 'absent' : late ? 'late' : 'present',
        justification: absent ? 'unjustified' : justified ? 'justified' : late ? 'justified' : 'not_applicable',
        reasonCode: justified ? 'medical' : late ? 'transport' : undefined,
        reasonLabel: justified ? 'Rendez-vous médical' : late ? 'Problème de transport' : undefined,
        changeNote: late ? 'Retard de 12 minutes (transport).' : undefined,
      })
    }
  }

  const absenceDeclarations: AbsenceDeclaration[] = [
    {
      id: 'abs-1', childId: 'stu-2', createdBySub: 'demo-guardian', createdByName: 'Camille Martin',
      fromDate: addDays(today, 1), toDate: addDays(today, 1), period: 'full_day',
      reasonCode: 'medical', reasonLabel: 'Rendez-vous médical',
      reasonText: 'Rendez-vous orthophoniste, retour prévu le lendemain.',
      attachmentName: 'convocation-orthophoniste.pdf',
      createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(), status: 'pending',
    },
    {
      id: 'abs-2', childId: 'stu-2', createdBySub: 'demo-guardian-2', createdByName: 'Alex Moreau',
      fromDate: addDays(today, -7), toDate: addDays(today, -7), period: 'morning',
      reasonCode: 'medical', reasonLabel: 'Rendez-vous médical',
      createdAt: addDays(today, -8), status: 'accepted', schoolComment: 'Justificatif reçu.',
    },
  ]

  const timetable: FamilyTimetableEntry[] = []
  for (const child of ['stu-1', 'stu-2', 'stu-5', 'stu-9']) {
    const subjects = child === 'stu-2' ? SUBJECTS_CP : SUBJECTS_CP.slice(0, 4)
    subjects.forEach((subject, index) => {
      timetable.push({
        id: `${child}-tt-${index}-${Math.floor(index / 3)}`, childId: child,
        day: index % 5, start: index % 3 === 0 ? '08:30' : index % 3 === 1 ? '10:15' : '13:30',
        end: index % 3 === 0 ? '10:00' : index % 3 === 1 ? '11:45' : '15:00',
        subject: subject[0], teacher: subject[1], room: subject[2],
      })
    })
  }
  const changeIndex = timetable.findIndex(entry => entry.childId === 'stu-2' && entry.day === (weekday % 5))
  if (changeIndex >= 0) {
    timetable[changeIndex] = {
      ...timetable[changeIndex],
      change: { kind: 'trip', note: 'Sortie au musée — pique-nique à prévoir.' },
    }
  }

  const homework: HomeworkItem[] = [
    {
      id: 'hw-1', childId: 'stu-2', subject: 'Lecture', title: 'Relire la page 24',
      description: 'Relire à voix haute le texte « Le chat de Mia » et colorier les mots difficiles.',
      teacher: 'Élise Martin', assignedAt: addDays(today, -1), dueAt: addDays(today, 1),
      attachments: [{ id: 'hwf-1', name: 'lecture-page-24.pdf', kind: 'pdf', sizeLabel: '320 Ko' }],
    },
    {
      id: 'hw-2', childId: 'stu-2', subject: 'Mathématiques', title: 'Fichier p. 18 exercices 1 à 3',
      description: 'Additions jusqu’à 10. Ne pas dépasser 15 minutes.',
      teacher: 'Élise Martin', assignedAt: today, dueAt: addDays(today, 2), attachments: [],
    },
    {
      id: 'hw-3', childId: 'stu-1', subject: 'Langage', title: 'Raconter une histoire',
      description: 'Choisir un album à la maison et raconter l’histoire avec ses mots.',
      teacher: 'Amélie Roux', assignedAt: today, dueAt: addDays(today, 3), attachments: [], readAt: new Date(now.getTime() - 3600_000).toISOString(),
    },
  ]

  const grades: GradeEntry[] = [
    { id: 'g-1', childId: 'stu-2', subject: 'Lecture', evaluation: 'Lecture fluide — album 1', date: addDays(today, -6), score: 17, outOf: 20, classAverage: 14.2, coefficient: 2, publishedAt: addDays(today, -5), teacherComment: 'Très bonne progression.' },
    { id: 'g-2', childId: 'stu-2', subject: 'Mathématiques', evaluation: 'Nombres jusqu’à 20', date: addDays(today, -3), score: 15, outOf: 20, classAverage: 13.8, coefficient: 1, publishedAt: addDays(today, -2) },
    { id: 'g-3', childId: 'stu-2', subject: 'Lecture', evaluation: 'Compréhension — épisode 2', date: addDays(today, -1), score: 18, outOf: 20, classAverage: 15.1, coefficient: 1, publishedAt: today },
    { id: 'g-4', childId: 'stu-1', subject: 'Langage', evaluation: 'Raconter une histoire', date: addDays(today, -4), score: 16, outOf: 20, coefficient: 1, publishedAt: addDays(today, -3) },
    { id: 'g-5', childId: 'stu-9', subject: 'Français', evaluation: 'Rédaction', date: addDays(today, -5), score: 12, outOf: 20, coefficient: 2, publishedAt: addDays(today, -4) },
  ]

  const bulletins: Bulletin[] = [
    { id: 'bul-1', childId: 'stu-2', period: 'Trimestre 1', publishedAt: addDays(today, -20), fileName: 'bulletin-trimestre-1-tom-martin.pdf', documentHash: 'sha256:4b1e6f…c9a2' },
    { id: 'bul-2', childId: 'stu-1', period: 'Trimestre 1', publishedAt: addDays(today, -20), fileName: 'bulletin-trimestre-1-lea-martin.pdf', documentHash: 'sha256:9d02aa…71f4' },
  ]

  const threads: FamilyThread[] = [
    {
      id: 'th-1', childId: 'stu-2', subject: 'Sortie musée — organisation',
      participants: [{ name: 'Élise Martin', role: 'teacher' }, { name: 'Camille Martin', role: 'guardian' }, { name: 'Alex Moreau', role: 'guardian' }],
      messages: [
        { id: 'm-1', threadId: 'th-1', fromName: 'Élise Martin', fromRole: 'teacher', body: 'Bonjour, la sortie au musée est confirmée pour jeudi. Merci de prévoir un pique-nique et de signer l’autorisation.', at: new Date(now.getTime() - 26 * 3600_000).toISOString(), attachments: [], readAt: new Date(now.getTime() - 25 * 3600_000).toISOString() },
        { id: 'm-2', threadId: 'th-1', fromName: 'Camille Martin', fromRole: 'guardian', body: 'Bonjour, l’autorisation est signée. Tom aura un pique-nique. Merci !', at: new Date(now.getTime() - 24 * 3600_000).toISOString(), attachments: [], readAt: new Date(now.getTime() - 23 * 3600_000).toISOString() },
        { id: 'm-3', threadId: 'th-1', fromName: 'Élise Martin', fromRole: 'teacher', body: 'Merci. Le départ est à 8h45, retour prévu à 16h30.', at: new Date(now.getTime() - 5 * 3600_000).toISOString(), attachments: [{ id: 'att-1', name: 'plan-sortie.pdf', kind: 'pdf', scanStatus: 'clean' }], readAt: undefined },
      ],
      unread: 1, retentionNotice: 'Messages conservés 3 ans conformément à la politique de l’établissement.',
      officeHoursAutoReply: { body: 'Votre message sera lu pendant les horaires d’ouverture (8h–17h).', nextOpen: 'demain 08:00' },
    },
    {
      id: 'th-2', childId: 'stu-2', subject: 'Question cantine',
      participants: [{ name: 'Nora Benali', role: 'school_life' }, { name: 'Alex Moreau', role: 'guardian' }],
      messages: [
        { id: 'm-4', threadId: 'th-2', fromName: 'Alex Moreau', fromRole: 'guardian', body: 'Bonjour, Tom signale que le menu de mardi ne lui convient pas. Pouvez-vous me confirmer les allergènes ?', at: new Date(now.getTime() - 30 * 3600_000).toISOString(), attachments: [], readAt: new Date(now.getTime() - 29 * 3600_000).toISOString() },
        { id: 'm-5', threadId: 'th-2', fromName: 'Nora Benali', fromRole: 'school_life', body: 'Bonjour, les menus et allergènes sont publiés chaque semaine dans l’espace famille. Nous ne transmettons pas de données de santé par message.', at: new Date(now.getTime() - 28 * 3600_000).toISOString(), attachments: [], readAt: undefined },
      ],
      unread: 1, retentionNotice: 'Messages conservés 3 ans conformément à la politique de l’établissement.',
    },
  ]

  const announcements: FamilyAnnouncement[] = [
    { id: 'ann-1', title: 'Réunion parents-professeurs', body: 'Rendez-vous le 20 novembre à 18h dans la salle polyvalente. Les créneaux sont ouverts dans l’espace rendez-vous.', author: 'Direction', audience: 'Tous les parents', publishedAt: '2026-11-15T10:00:00Z', readAt: '2026-11-15T12:00:00Z', requiresReceipt: true, category: 'school' },
    { id: 'ann-2', title: 'Sortie au musée — CP A', body: 'La sortie du jeudi 20 novembre est maintenue. Pensez à signer l’autorisation si ce n’est pas déjà fait.', author: 'Élise Martin', audience: 'CP A', publishedAt: '2026-11-17T08:00:00Z', requiresReceipt: true, childIds: ['stu-2'], category: 'trip' },
    { id: 'ann-3', title: 'Photo de classe', body: 'La photo de classe aura lieu vendredi matin. Aucune publication en ligne sans votre accord écrit.', author: 'Direction', audience: 'Primaire', publishedAt: '2026-11-10T09:00:00Z', readAt: '2026-11-10T18:00:00Z', requiresReceipt: false, category: 'class' },
  ]

  const calendar: SchoolCalendarEvent[] = [
    { id: 'cal-1', title: 'Vacances de Noël', start: '2026-12-19', end: '2027-01-04', kind: 'holiday', zone: 'C' },
    { id: 'cal-2', title: 'Fermeture exceptionnelle', start: '2026-12-08', end: '2026-12-08', kind: 'closure' },
    { id: 'cal-3', title: 'Réunion parents-professeurs', start: '2026-11-20', end: '2026-11-20', kind: 'meeting' },
    { id: 'cal-4', title: 'Sortie musée CP A', start: '2026-11-20', end: '2026-11-20', kind: 'event' },
  ]

  const forms: FormAssignment[] = [
    {
      id: 'fa-1', templateId: 'tpl-trip', childId: 'stu-2', title: 'Sortie au musée d’Orsay — autorisation',
      description: 'Sortie pédagogique du jeudi 20 novembre, départ 8h45, retour 16h30. Pique-nique à prévoir.',
      formType: 'trip', signatoryRule: 'both_guardians', dueAt: addDays(today, 3), issuedAt: addDays(today, -6),
      status: 'partially_signed',
      signatures: [{
        id: 'sig-1', signerSub: 'demo-guardian', signerName: 'Camille Martin',
        signedAt: addDays(today, -5), documentHash: 'sha256:aa51…9b02', ipHash: 'hmac:8f20…',
        device: 'iPhone · Safari', method: 'password', proofLabel: 'Signature simple — identité de session',
      }],
      requiredSignerSubs: ['demo-guardian', 'demo-guardian-2'],
      withdrawable: false, attachmentName: 'autorisation-sortie-musee.pdf', legalNotice: FAMILY_POLICY.signatureNotice,
    },
    {
      id: 'fa-2', templateId: 'tpl-image', childId: 'stu-1', title: 'Droit à l’image 2026-2027',
      description: 'Autorisation de diffusion d’images de votre enfant dans les supports internes de l’école.',
      formType: 'image_rights', signatoryRule: 'one_guardian', dueAt: addDays(today, 10), issuedAt: addDays(today, -2),
      status: 'pending', signatures: [], requiredSignerSubs: ['demo-guardian'],
      withdrawable: true, legalNotice: FAMILY_POLICY.signatureNotice,
    },
    {
      id: 'fa-3', templateId: 'tpl-rules', childId: 'stu-1', title: 'Règlement intérieur et financier',
      description: 'Prise de connaissance du règlement intérieur 2026-2027.',
      formType: 'rules_acceptance', signatoryRule: 'legal_representative_only', dueAt: addDays(today, -1), issuedAt: addDays(today, -30),
      status: 'signed',
      signatures: [{
        id: 'sig-2', signerSub: 'demo-guardian', signerName: 'Camille Martin',
        signedAt: addDays(today, -28), documentHash: 'sha256:77cc…01ef', ipHash: 'hmac:33aa…',
        device: 'Mac · Chrome', method: 'mfa', proofLabel: 'Signature avancée — MFA vérifié',
      }],
      requiredSignerSubs: ['demo-guardian'], withdrawable: false, attachmentName: 'reglement-interieur-2026.pdf',
      legalNotice: FAMILY_POLICY.signatureNotice,
    },
    {
      id: 'fa-4', templateId: 'tpl-departure', childId: 'stu-2', title: 'Départ autonome — fin de journée',
      description: 'Autorisation pour Tom de rentrer seul à pied après la classe, à partir du 1er décembre.',
      formType: 'autonomous_departure', signatoryRule: 'both_guardians', dueAt: addDays(today, 7), issuedAt: addDays(today, -1),
      status: 'pending', signatures: [], requiredSignerSubs: ['demo-guardian', 'demo-guardian-2'],
      withdrawable: true, legalNotice: FAMILY_POLICY.signatureNotice,
    },
    {
      id: 'fa-5', templateId: 'tpl-health', childId: 'stu-1', title: 'Projet d’accueil individualisé (PAI)',
      description: 'Document de santé transmis directement au service concerné. Il n’est pas lu ni interprété par le portail.',
      formType: 'health_document', signatoryRule: 'legal_representative_only', dueAt: addDays(today, 14), issuedAt: addDays(today, -1),
      status: 'pending', signatures: [], requiredSignerSubs: ['demo-guardian'], withdrawable: false,
      routesTo: 'Infirmerie — dossier confidentiel', legalNotice: FAMILY_POLICY.signatureNotice,
    },
  ]

  const consents: ConsentProof[] = [
    { id: 'con-1', childId: 'stu-1', purpose: 'photo-school', label: 'Photos scolaires internes', legalBasis: 'consent', granted: true, version: '2026-09-1', grantedAt: '2026-09-05', proofHash: 'sha256:11aa…', text: `Consentement recueilli pour la diffusion interne des photos. ${LEGAL}` },
    { id: 'con-2', childId: 'stu-1', purpose: 'class-photo', label: 'Photo de classe (achat)', legalBasis: 'contract', granted: true, version: '2026-09-1', grantedAt: '2026-09-05', text: `Traitement nécessaire à la commande. ${LEGAL}` },
    { id: 'con-3', childId: 'stu-2', purpose: 'photo-school', label: 'Photos scolaires internes', legalBasis: 'consent', granted: true, version: '2026-09-1', grantedAt: '2026-09-05', proofHash: 'sha256:22bb…', text: `Consentement recueilli pour la diffusion interne des photos. ${LEGAL}` },
  ]

  const collectors: AuthorizedPerson[] = [
    { id: 'ap-1', childId: 'stu-2', name: 'Claire Martin', relationship: 'Grand-mère', phone: '06 12 88 40 21', idCheckRequired: true, validFrom: '2025-09-01', status: 'approved', createdBySub: 'demo-guardian', createdByName: 'Camille Martin', createdAt: '2025-09-02', approvedBy: 'Nora Benali', approvedAt: '2025-09-03' },
    { id: 'ap-2', childId: 'stu-2', name: 'Nadia Moreau', relationship: 'Tante', phone: '07 44 31 09 12', idCheckRequired: true, validFrom: addDays(today, 1), validTo: addDays(today, 120), status: 'pending', createdBySub: 'demo-guardian-2', createdByName: 'Alex Moreau', createdAt: addDays(today, -1), note: 'Récupère Tom le mercredi après l’activité échecs.' },
    { id: 'ap-3', childId: 'stu-1', name: 'Paul Roux', relationship: 'Voisin', phone: '06 55 10 22 84', idCheckRequired: false, validFrom: '2026-09-01', status: 'approved', createdBySub: 'demo-guardian', createdByName: 'Camille Martin', createdAt: '2026-09-02', approvedBy: 'Hugo Leroy', approvedAt: '2026-09-02' },
  ]

  const slots: AppointmentSlot[] = [
    { id: 'as-1', teacherName: 'Élise Martin', teacherRole: 'Enseignante principale · CP A', childId: 'stu-2', date: addDays(today, 2), start: '17:00', end: '17:20', mode: 'in_person', location: 'Salle 08', topic: 'Suivi de trimestre', jointMeeting: true },
    { id: 'as-2', teacherName: 'Élise Martin', teacherRole: 'Enseignante principale · CP A', childId: 'stu-2', date: addDays(today, 2), start: '17:20', end: '17:40', mode: 'in_person', location: 'Salle 08', topic: 'Suivi de trimestre', jointMeeting: true },
    { id: 'as-3', teacherName: 'Amélie Roux', teacherRole: 'Enseignante principale · MS A', childId: 'stu-1', date: addDays(today, 3), start: '16:30', end: '16:50', mode: 'video', topic: 'Adaptation en classe', jointMeeting: true },
    { id: 'as-4', teacherName: 'Nora Benali', teacherRole: 'Vie scolaire', childId: 'stu-2', date: addDays(today, 5), start: '12:30', end: '12:50', mode: 'phone', topic: 'Question périscolaire', jointMeeting: false, bookedBy: 'demo-guardian-petit', bookedByName: 'Sophie Petit' },
  ]

  const enrolments: FamilyActivityEnrolment[] = [
    { id: 'en-1', childId: 'stu-2', offeringId: 'off-1', activityName: 'Échecs — CP/CE1', status: 'waitlisted', waitlistPosition: 2, enrolledAt: addDays(today, -4), feeCents: 8500, currency: 'EUR', consentRequired: true, consentGranted: true },
    { id: 'en-2', childId: 'stu-1', offeringId: 'off-2', activityName: 'Arts plastiques', status: 'confirmed', enrolledAt: addDays(today, -9), feeCents: 6200, currency: 'EUR', consentRequired: true, consentGranted: true },
  ]

  const invoices: FamilyInvoice[] = [
    { id: 'finv-1', label: 'Cantine — Novembre 2026', studentId: 'stu-2', amountCents: 8400, currency: 'EUR', dueDate: '2026-11-30', status: 'due', payerSubs: ['demo-guardian'] },
    { id: 'finv-2', label: 'Garderie — Novembre 2026', studentId: 'stu-2', amountCents: 4200, currency: 'EUR', dueDate: '2026-11-15', status: 'overdue', payerSubs: ['demo-guardian'] },
    { id: 'finv-3', label: 'Sortie musée d’Orsay', studentId: 'stu-2', amountCents: 1200, currency: 'EUR', dueDate: '2026-11-22', status: 'due', payerSubs: ['demo-guardian-2'] },
    { id: 'finv-4', label: 'Cantine — Novembre 2026', studentId: 'stu-5', amountCents: 7600, currency: 'EUR', dueDate: '2026-11-30', status: 'due', payerSubs: ['demo-guardian-petit'] },
  ]

  const menus: CanteenMenuItem[] = Array.from({ length: 5 }).map((_, index) => ({
    day: addDays(monday, index),
    starter: ['Salade verte', 'Betteraves', 'Concombre', 'Carottes râpées', 'Tomates'][index],
    main: ['Poulet rôti, riz', 'Poisson pané, purée', 'Bœuf bourguignon, pâtes', 'Omelette, haricots verts', 'Quiche lorraine, salade'][index],
    side: ['Yaourt nature', 'Fromage blanc', 'Compote', 'Fruit de saison', 'Yaourt aux fruits'][index],
    dessert: ['Pomme', 'Poire', 'Orange', 'Kiwi', 'Banane'][index],
    allergens: index === 1 ? ['poisson', 'gluten'] : index === 4 ? ['gluten', 'œuf', 'lait'] : index === 0 ? ['lait'] : [],
    vegetarian: index === 3,
  }))

  const reservations: CanteenReservation[] = [
    { id: 'cr-1', childId: 'stu-2', date: addDays(today, 1), status: 'reserved', cutoffAt: `${addDays(today, 1)}T10:00:00`, billed: false },
    { id: 'cr-2', childId: 'stu-2', date: addDays(today, 2), status: 'reserved', cutoffAt: `${addDays(today, 2)}T10:00:00`, billed: false },
    { id: 'cr-3', childId: 'stu-1', date: addDays(today, -1), status: 'absent', cutoffAt: `${addDays(today, -1)}T10:00:00`, billed: true },
  ]

  const documents: FamilyDocument[] = [
    { id: 'doc-1', childId: 'stu-2', type: 'certificat_scolarite', title: 'Certificat de scolarité 2026-2027', status: 'available', availableAt: '2026-09-15T08:00:00Z', expiresAt: addDays(today, 7), downloadUrl: '/v1/family/documents/doc-1/download?token=mock', watermark: 'Tom Martin · Famille Martin · téléchargé le jour même', requiresApproval: false },
    { id: 'doc-2', childId: 'stu-1', type: 'reglement_interieur', title: 'Règlement intérieur 2026-2027', status: 'available', availableAt: '2026-09-01T08:00:00Z', expiresAt: addDays(today, 30), downloadUrl: '/v1/family/documents/doc-2/download?token=mock', watermark: 'Léa Martin · Famille Martin', requiresApproval: false },
    { id: 'doc-3', childId: 'stu-2', type: 'attestation_scolarite', title: 'Attestation de scolarité — assurance', status: 'requested', requestedAt: addDays(today, -1), requiresApproval: true },
  ]

  const downloads: DocumentDownload[] = [
    { id: 'dl-1', documentId: 'doc-2', documentTitle: 'Règlement intérieur 2026-2027', childId: 'stu-1', downloadedAt: new Date(now.getTime() - 4 * 86400_000).toISOString(), watermark: 'Léa Martin · Famille Martin', ipHash: 'hmac:77aa…' },
  ]

  const preferences: NotificationPreferences = {
    items: [
      { category: 'attendance', label: 'Présences et absences', inApp: true, email: true, push: true, mandatory: true },
      { category: 'grades', label: 'Notes et bulletins', inApp: true, email: true, push: false, mandatory: false },
      { category: 'messages', label: 'Messages', inApp: true, email: true, push: true, mandatory: false },
      { category: 'announcements', label: 'Annonces', inApp: true, email: true, push: false, mandatory: true },
      { category: 'forms', label: 'Formulaires à signer', inApp: true, email: true, push: true, mandatory: true },
      { category: 'appointments', label: 'Rendez-vous', inApp: true, email: true, push: false, mandatory: false },
      { category: 'activities', label: 'Activités', inApp: true, email: false, push: false, mandatory: false },
      { category: 'billing', label: 'Facturation', inApp: true, email: true, push: false, mandatory: false },
      { category: 'documents', label: 'Documents', inApp: true, email: false, push: false, mandatory: false },
      { category: 'safety', label: 'Sécurité', inApp: true, email: true, push: true, mandatory: true },
    ],
    digest: 'weekly',
    quietHours: { start: '18:00', end: '08:00', enabled: true },
    language: 'fr',
    accessibility: { textSize: 'normal', highContrast: false, reducedMotion: false },
    pushContentFree: true,
  }

  const devices: DeviceSession[] = [
    { id: 'dev-1', label: 'Ce navigateur', device: 'Mac · Chrome 141', lastSeen: new Date(now.getTime() - 2 * 60_000).toISOString(), current: true, location: 'Saint-Denis, FR', mfa: true },
    { id: 'dev-2', label: 'Téléphone', device: 'iPhone · Safari', lastSeen: new Date(now.getTime() - 26 * 3600_000).toISOString(), current: false, location: 'Saint-Denis, FR', mfa: true },
  ]

  const dataRequests: FamilyDataRequest[] = [
    {
      id: 'dr-1', type: 'export', childId: 'stu-2', subject: 'Tom Martin', requestedAt: addDays(today, -6),
      status: 'in_progress', dueAt: addDays(today, 24),
      legalExceptions: ['Les données couvertes par une obligation légale de conservation ne peuvent pas être effacées.'],
      handler: 'Camille Durand',
    },
  ]

  const concerns: ConcernSubmission[] = []
  const audit: FamilyData['audit'] = [
    { id: 'fau-1', at: new Date(now.getTime() - 2 * 3600_000).toISOString(), actorSub: 'demo-guardian', action: 'GUARDIAN_LOGIN', target: 'session' },
    { id: 'fau-2', at: addDays(today, -5), actorSub: 'demo-guardian', action: 'FORM_SIGNED', target: 'fa-1' },
  ]

  const icsFeeds: IcsFeed[] = [
    { token: 'ics-family-abc123', childId: 'stu-2', url: '/v1/family/calendar/ics?token=ics-family-abc123', createdAt: addDays(today, -30), genericTitles: true },
  ]

  return {
    links, restrictions, children, invitations, attendance, absenceDeclarations, timetable, icsFeeds,
    homework, grades, bulletins, threads, announcements, calendar, forms, consents, collectors, slots,
    enrolments, invoices, receipts: [], menus, reservations, documents, downloads,
    preferences, devices, dataRequests, concerns, policy: FAMILY_POLICY, audit,
  }
}
