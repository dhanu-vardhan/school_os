import type {
  Announcement, AiSuggestion, AuditEvent, ClassGroup, ConsentRecord, DataExportRequest,
  Guardian, Holiday, Invoice, Message, Notification, RetentionPolicy, SafeguardingConcern,
  School, Student, Activity, ActivityOffering, TimetableEvent, AttendanceRecord,
} from './types'
import type { DisplayRole } from './roles'

// Local alias so this file can be authored before index.ts is regenerated.
type Role = DisplayRole

export interface DemoUser {
  role: Role
  sub: string
  name: string
  schoolId: string
  schoolName: string
  email: string
}

export interface DemoData {
  schools: School[]
  users: DemoUser[]
  students: Student[]
  classes: ClassGroup[]
  guardians: Guardian[]
  activities: Activity[]
  offerings: ActivityOffering[]
  concerns: SafeguardingConcern[]
  suggestions: AiSuggestion[]
  notifications: Notification[]
  messages: Message[]
  announcements: Announcement[]
  invoices: Invoice[]
  consents: ConsentRecord[]
  retentionPolicies: RetentionPolicy[]
  audit: AuditEvent[]
  holidays: Holiday[]
  timetable: TimetableEvent[]
  attendance: AttendanceRecord[]
  dataRequests: DataExportRequest[]
}

export const SCHOOL_A = '11111111-1111-4111-8111-111111111111'
export const SCHOOL_B = '22222222-2222-4222-8222-222222222222'

const names = [
  ['Léa', 'Martin'], ['Tom', 'Martin'], ['Inès', 'Benali'], ['Adam', 'Roux'],
  ['Jade', 'Petit'], ['Noah', 'Durand'], ['Emma', 'Cohen'], ['Lucas', 'Bernard'],
  ['Chloé', 'Leroy'], ['Hugo', 'Moreau'], ['Nina', 'Diallo'], ['Louis', 'Perrin'],
  ['Manon', 'Girard'], ['Raphaël', 'Fontaine'], ['Alice', 'Chevalier'], ['Sami', 'Haddad'],
] as const

const classes: ClassGroup[] = [
  // Site primaire (maternelle / élémentaire)
  { id: 'c-ms', name: 'Moyenne Section A', level: 'MS', teacher: 'Amélie Roux', room: 'Site primaire – Salle 04', headcount: 22, capacity: 24, attendanceToday: 21 },
  { id: 'c-cp', name: 'CP A', level: 'CP', teacher: 'Élise Martin', room: 'Site primaire – Salle 08', headcount: 23, capacity: 25, attendanceToday: 22 },
  { id: 'c-ce1', name: 'CE1 B', level: 'CE1', teacher: 'Inès Diallo', room: 'Site primaire – Salle 10', headcount: 24, capacity: 26, attendanceToday: 24 },
  { id: 'c-ce2', name: 'CE2 A', level: 'CE2', teacher: 'Laura Perrin', room: 'Site primaire – Salle 11', headcount: 21, capacity: 26, attendanceToday: 20 },
  { id: 'c-cm1', name: 'CM1 A', level: 'CM1', teacher: 'Julien Petit', room: 'Site primaire – Salle 12', headcount: 25, capacity: 28, attendanceToday: 25 },
  { id: 'c-cm2', name: 'CM2 B', level: 'CM2', teacher: 'Nora Benali', room: 'Site primaire – Salle 14', headcount: 26, capacity: 28, attendanceToday: 24 },
  // Site collège
  { id: 'c-6e', name: '6e Rentrée', level: '6e', teacher: 'Paul Girard', room: 'Site collège – Bât. B 02', headcount: 27, capacity: 30, attendanceToday: 26 },
  { id: 'c-5e', name: '5e Descartes', level: '5e', teacher: 'Sarah Cohen', room: 'Site collège – Bât. B 06', headcount: 25, capacity: 30, attendanceToday: 24 },
]

const classIds = classes.map(c => c.id)

export function makeDemoData(): DemoData {
  const students: Student[] = names.map(([first, last], i) => ({
    id: `stu-${i + 1}`,
    firstName: first,
    lastName: last,
    birthDate: `${2015 + (i % 7)}-0${(i % 9) + 1}-1${i % 9}`,
    ineNumber: `INE${String(1200000 + i * 137)}`,
    classId: classIds[i % classIds.length],
    enrolmentDate: i < 12 ? '2026-09-01' : '2026-10-15',
    languagesSpoken: i % 4 === 0 ? 'Français, Arabe' : i % 3 === 0 ? 'Français, Anglais' : 'Français',
    version: 1,
  }))

  // Today's marks are deterministic demo data: mostly present with a few late/absent.
  const today = new Date().toISOString().slice(0, 10)
  const attendance: AttendanceRecord[] = students.map((s, i) => ({
    id: `att-${s.id}`,
    studentId: s.id,
    classId: s.classId ?? '',
    date: today,
    status: i % 11 === 0 ? 'absent' : i % 5 === 0 ? 'late' : 'present',
  }))

  return {
    schools: [
      { id: SCHOOL_A, name: 'Groupe scolaire Saint-Denis – Site primaire', timezone: 'Europe/Paris', locale: 'fr', academicYear: '2026-2027', address: '12 rue de la République, 93100 Saint-Denis', logoText: 'GSP' },
      { id: SCHOOL_B, name: 'Groupe scolaire Saint-Denis – Site collège', timezone: 'Europe/Paris', locale: 'fr', academicYear: '2026-2027', address: '8 avenue du Général Leclerc, 93260 Les Lilas', logoText: 'GSC' },
    ],
    users: [
      { role: 'director', sub: 'demo-director', name: 'Camille Durand', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'direction@saint-denis.edu.fr' },
      { role: 'deputy', sub: 'demo-deputy', name: 'Nora Benali', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'adjointe@saint-denis.edu.fr' },
      { role: 'teacher', sub: 'demo-teacher', name: 'Élise Martin', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'e.martin@saint-denis.edu.fr' },
      { role: 'assistant', sub: 'demo-assistant', name: 'Yanis Petit', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'y.petit@saint-denis.edu.fr' },
      { role: 'finance', sub: 'demo-finance', name: 'Sarah Cohen', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'compta@saint-denis.edu.fr' },
      { role: 'admissions', sub: 'demo-admissions', name: 'Lucie Bernard', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'admissions@saint-denis.edu.fr' },
      { role: 'reception', sub: 'demo-reception', name: 'Hugo Leroy', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'accueil@saint-denis.edu.fr' },
      { role: 'guardian', sub: 'demo-guardian', name: 'Famille Martin', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'famille.martin@example.fr' },
      { role: 'guardian2', sub: 'demo-guardian-2', name: 'Alex Moreau', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'alex.moreau@example.fr' },
      { role: 'student', sub: 'demo-student', name: 'Jade Petit', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'jade.petit@example.fr' },
      { role: 'instructor', sub: 'demo-instructor', name: 'Mina Diallo', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'm.diallo@club-echecs.fr' },
      { role: 'provider', sub: 'demo-provider', name: 'Club Échecs Paris', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'contact@club-echecs.fr' },
      { role: 'safeguarding', sub: 'demo-safeguarding', name: 'Dr Paul Girard', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'protection@saint-denis.edu.fr' },
      { role: 'therapist', sub: 'demo-therapist', name: 'Claire Aubry', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'c.aubry@saint-denis.edu.fr' },
      { role: 'operator', sub: 'demo-operator', name: 'Opérateur Plateforme', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'ops@schoolos.app' },
      { role: 'analyst', sub: 'demo-analyst', name: 'Analyste de données', schoolId: SCHOOL_A, schoolName: 'Groupe scolaire Saint-Denis – Site primaire', email: 'analyste@saint-denis.edu.fr' },
    ],
    students,
    classes,
    guardians: [
      { id: 'g-1', studentIds: ['stu-1', 'stu-2'], name: 'Famille Martin', email: 'famille.martin@example.fr', phone: '06 12 34 56 78', relation: 'Parents', pickupAuthorised: true },
      { id: 'g-2', studentIds: ['stu-3'], name: 'Nadia Benali', email: 'n.benali@example.fr', phone: '06 98 76 54 32', relation: 'Mère', pickupAuthorised: true },
      { id: 'g-3', studentIds: ['stu-4'], name: 'Karim Roux', email: 'k.roux@example.fr', phone: '07 55 20 10 05', relation: 'Père', pickupAuthorised: false, custodyNotes: 'Retrait restreint — pièce d’identité obligatoire.' },
      { id: 'g-4', studentIds: ['stu-5', 'stu-9'], name: 'Sophie Petit', email: 's.petit@example.fr', phone: '06 44 28 19 30', relation: 'Mère', pickupAuthorised: true },
    ],
    activities: [
      { id: 'act-1', name: 'Échecs — CP/CE1', type: 'club', description: 'Initiation et perfectionnement aux échecs, avec tournois internes en fin de trimestre.', minAge: 6, maxAge: 9, category: 'Loisirs', day: 'Mardi 16:30', icon: 'chess', imageTone: 'brand' },
      { id: 'act-2', name: 'Arts plastiques', type: 'atelier', description: 'Peinture, collage et sculpture avec des matériaux recyclés.', minAge: 5, maxAge: 10, category: 'Créatif', day: 'Jeudi 15:00', icon: 'art', imageTone: 'accent' },
      { id: 'act-3', name: 'Football en herbe', type: 'sport', description: 'Apprentissage des gestes et du jeu d’équipe sur le terrain de la cour.', minAge: 7, maxAge: 11, category: 'Sport', day: 'Mercredi 14:00', icon: 'sport', imageTone: 'info' },
      { id: 'act-4', name: 'Chorale Les Petites Voix', type: 'music', description: 'Éveil vocal et préparation aux spectacles de fin d’année.', minAge: 6, maxAge: 12, category: 'Culture', day: 'Vendredi 17:00', icon: 'music', imageTone: 'warning' },
      { id: 'act-5', name: 'Anglais ludique', type: 'language', description: 'Atelier conversation en anglais autour de jeux et de chansons.', minAge: 6, maxAge: 10, category: 'Langues', day: 'Lundi 16:30', icon: 'language', imageTone: 'brand' },
      { id: 'act-6', name: 'Cuisine du mardi', type: 'atelier', description: 'Recettes simples et saisonnières, allergènes affichés chaque semaine.', minAge: 8, maxAge: 12, category: 'Découverte', day: 'Mardi 17:30', icon: 'art', imageTone: 'accent' },
    ],
    offerings: [
      { id: 'off-1', activityId: 'act-1', term: 'Automne 2026', capacity: 16, booked: 15, waitlist: 3, minEnrolment: 6, priceCents: 8500, currency: 'EUR', status: 'open', location: 'Salle 08', registrationCloseAt: '2026-12-18', sessions: [{ id: 's1', date: '2026-11-24', start: '16:30', end: '17:30' }, { id: 's2', date: '2026-12-01', start: '16:30', end: '17:30' }] },
      { id: 'off-2', activityId: 'act-2', term: 'Automne 2026', capacity: 12, booked: 10, waitlist: 0, minEnrolment: 5, priceCents: 6200, currency: 'EUR', status: 'open', location: 'Atelier 2', sessions: [{ id: 's3', date: '2026-11-26', start: '15:00', end: '16:15' }] },
      { id: 'off-3', activityId: 'act-3', term: 'Automne 2026', capacity: 20, booked: 20, waitlist: 5, minEnrolment: 8, priceCents: 4500, currency: 'EUR', status: 'full', location: 'Cour de récréation', sessions: [{ id: 's4', date: '2026-11-25', start: '14:00', end: '15:30' }] },
      { id: 'off-4', activityId: 'act-4', term: 'Automne 2026', capacity: 24, booked: 18, waitlist: 0, minEnrolment: 10, priceCents: 0, currency: 'EUR', status: 'open', location: 'Salle de musique', sessions: [{ id: 's5', date: '2026-11-27', start: '17:00', end: '18:00' }] },
      { id: 'off-5', activityId: 'act-5', term: 'Automne 2026', capacity: 14, booked: 7, waitlist: 0, minEnrolment: 6, priceCents: 7800, currency: 'EUR', status: 'open', location: 'Salle 04', sessions: [{ id: 's6', date: '2026-11-23', start: '16:30', end: '17:15' }] },
      { id: 'off-6', activityId: 'act-6', term: 'Automne 2026', capacity: 12, booked: 9, waitlist: 2, minEnrolment: 6, priceCents: 9500, currency: 'EUR', status: 'open', location: 'Cuisine', sessions: [{ id: 's7', date: '2026-11-24', start: '17:30', end: '18:30' }] },
    ],
    concerns: [
      { id: 'sc-1', reference: 'SC-2026-014', category: 'wellbeing', status: 'open', createdAt: '2026-11-14T09:20:00Z', updatedAt: '2026-11-14T09:20:00Z', reportedByRole: 'teacher', subjectInitials: 'L.M.', summary: 'Fiche de signalement — contenu réservé aux personnels habilités.', events: [{ id: 'e1', at: '2026-11-14T09:20:00Z', actorRole: 'teacher', action: 'Signalement ouvert' }] },
      { id: 'sc-2', reference: 'SC-2026-013', category: 'attendance', status: 'under_review', createdAt: '2026-11-10T13:05:00Z', updatedAt: '2026-11-12T10:30:00Z', reportedByRole: 'reception', subjectInitials: 'A.R.', summary: 'Fiche de signalement — contenu réservé aux personnels habilités.', assignee: 'Dr Paul Girard', events: [{ id: 'e2', at: '2026-11-10T13:05:00Z', actorRole: 'reception', action: 'Signalement ouvert' }, { id: 'e3', at: '2026-11-12T10:30:00Z', actorRole: 'safeguarding', action: 'Statut modifié : en cours d’examen' }] },
      { id: 'sc-3', reference: 'SC-2026-009', category: 'safety', status: 'closed', createdAt: '2026-10-22T08:40:00Z', updatedAt: '2026-11-02T16:10:00Z', reportedByRole: 'assistant', subjectInitials: 'T.M.', summary: 'Fiche de signalement — contenu réservé aux personnels habilités.', events: [{ id: 'e4', at: '2026-10-22T08:40:00Z', actorRole: 'assistant', action: 'Signalement ouvert' }, { id: 'e5', at: '2026-11-02T16:10:00Z', actorRole: 'safeguarding', action: 'Signalement clôturé' }] },
    ],
    suggestions: [
      { id: 'ai-1', feature: 'report-comment', title: 'Bulletin comment draft — Léa M.', body: 'Léa participe avec attention aux activités de lecture. Elle gagne en autonomie et aide volontiers ses camarades lors des ateliers.', modelId: 'local-draft-v1', status: 'proposed', confidence: 0.82, redacted: true, createdAt: '2026-11-16T10:12:00Z' },
      { id: 'ai-2', feature: 'message-tone', title: 'Parent message tone check', body: 'Bonjour, nous vous informons que la sortie au musée prévue mardi est maintenue. Merci de signer l’autorisation avant lundi.', modelId: 'local-draft-v1', status: 'proposed', confidence: 0.91, redacted: true, createdAt: '2026-11-16T11:40:00Z' },
      { id: 'ai-3', feature: 'weekly-brief', title: 'Point hebdomadaire — direction', body: 'La fréquentation moyenne a atteint 94 % cette semaine. Deux classes approchent de leur capacité. Trois listes d’attente d’activités doivent être examinées avant vendredi.', modelId: 'local-draft-v1', status: 'proposed', confidence: 0.76, redacted: true, createdAt: '2026-11-15T07:30:00Z' },
    ],
    notifications: [
      { id: 'n-1', title: 'Appel enregistré', body: 'CP A — 22 présents, 1 retard.', at: '2026-11-17T08:35:00Z', read: false, tone: 'success', category: 'attendance' },
      { id: 'n-2', title: 'Nouveau message', body: 'Élise Martin a envoyé un message au sujet de la sortie au musée.', at: '2026-11-17T08:12:00Z', read: false, tone: 'info', category: 'message' },
      { id: 'n-3', title: 'Liste d’attente activité', body: 'Football en herbe compte 5 élèves en attente.', at: '2026-11-16T17:00:00Z', read: false, tone: 'warning', category: 'activity' },
      { id: 'n-4', title: 'Facture en retard', body: 'Garderie — novembre 2026 est en retard.', at: '2026-11-15T09:00:00Z', read: true, tone: 'danger', category: 'billing' },
      { id: 'n-5', title: 'Maintenance planifiée', body: 'Maintenance prévue dimanche de 02:00 à 04:00.', at: '2026-11-14T12:00:00Z', read: true, tone: 'info', category: 'system' },
    ],
    messages: [
      { id: 'msg-1', from: 'Élise Martin', to: 'Famille Martin', subject: 'Sortie musée — autorisation', body: 'Bonjour, pensez à signer l’autorisation pour la sortie de mardi au musée.', at: '2026-11-17T08:12:00Z', read: false, replies: [] },
      { id: 'msg-2', from: 'Famille Martin', to: 'Élise Martin', subject: 'Re: Sortie musée', body: 'Bonjour, l’autorisation sera signée ce soir. Merci.', at: '2026-11-16T19:22:00Z', read: true, replies: [] },
      { id: 'msg-3', from: 'Direction', to: 'Tous les parents', subject: 'Réunion parents-professeurs', body: 'La réunion se tiendra le 20 novembre à 18h à la salle polyvalente.', at: '2026-11-15T10:00:00Z', read: true, replies: [] },
    ],
    announcements: [
      { id: 'ann-1', title: 'Réunion parents-professeurs', body: 'Rendez-vous le 20 novembre à 18h dans la salle polyvalente.', author: 'Direction', at: '2026-11-15T10:00:00Z', audience: 'Tous les parents' },
      { id: 'ann-2', title: 'Vacances de la Toussaint', body: 'Les classes reprennent le 3 novembre. Merci à tous pour votre patience.', author: 'Direction', at: '2026-11-02T08:00:00Z', audience: 'École' },
    ],
    invoices: [
      { id: 'inv-1', label: 'Cantine — Novembre 2026', studentId: 'stu-1', amountCents: 8400, currency: 'EUR', dueDate: '2026-11-30', status: 'due' },
      { id: 'inv-2', label: 'Garderie — Novembre 2026', studentId: 'stu-2', amountCents: 4200, currency: 'EUR', dueDate: '2026-11-15', status: 'overdue' },
      { id: 'inv-3', label: 'Échecs — Automne 2026', studentId: 'stu-1', amountCents: 8500, currency: 'EUR', dueDate: '2026-11-10', status: 'paid' },
      { id: 'inv-4', label: 'Cantine — Octobre 2026', studentId: 'stu-3', amountCents: 7600, currency: 'EUR', dueDate: '2026-10-31', status: 'failed' },
    ],
    consents: [
      { id: 'con-1', studentId: 'stu-1', consentType: 'photo-school', granted: true, grantedAt: '2026-09-05' },
      { id: 'con-2', studentId: 'stu-1', consentType: 'museum-trip', granted: false },
      { id: 'con-3', studentId: 'stu-2', consentType: 'photo-school', granted: true, grantedAt: '2026-09-05' },
    ],
    retentionPolicies: [
      { id: 'ret-1', dataType: 'attendance', retentionDays: 3650, action: 'archive', nextRun: '2027-01-01', enabled: true },
      { id: 'ret-2', dataType: 'messages', retentionDays: 1095, action: 'delete', nextRun: '2027-01-01', enabled: true },
      { id: 'ret-3', dataType: 'ai_suggestion', retentionDays: 180, action: 'delete', nextRun: '2026-12-01', enabled: true },
      { id: 'ret-4', dataType: 'audit', retentionDays: 2555, action: 'archive', nextRun: '2027-01-01', enabled: true },
    ],
    audit: [
      { id: 'aud-1', at: '2026-11-17T08:35:00Z', actor: 'Élise Martin', action: 'ATTENDANCE_RECORDED', target: 'CP A' },
      { id: 'aud-2', at: '2026-11-16T18:02:00Z', actor: 'Sarah Cohen', action: 'INVOICE_UPDATED', target: 'inv-2' },
      { id: 'aud-3', at: '2026-11-16T10:12:00Z', actor: 'System', action: 'AI_SUGGESTION_CREATED', target: 'ai-1' },
      { id: 'aud-4', at: '2026-11-15T14:30:00Z', actor: 'Camille Durand', action: 'ANNOUNCEMENT_PUBLISHED', target: 'ann-1' },
      { id: 'aud-5', at: '2026-11-14T09:20:00Z', actor: 'Élise Martin', action: 'CONCERN_OPENED', target: 'SC-2026-014' },
    ],
    holidays: [
      { name: 'Toussaint', start: '2026-10-17', end: '2026-11-02' },
      { name: 'Noël', start: '2026-12-19', end: '2027-01-04' },
      { name: 'Hiver', start: '2027-02-06', end: '2027-02-22' },
      { name: 'Printemps', start: '2027-04-03', end: '2027-04-19' },
      { name: 'Été', start: '2027-07-03', end: '2027-09-01' },
    ],
    timetable: [
      { id: 't-1', day: 0, start: 9, end: 10.5, title: 'Lecture', subtitle: 'CP A · Salle 08', tone: 'brand' },
      { id: 't-2', day: 0, start: 14, end: 15, title: 'Mathématiques', subtitle: 'CP A · Salle 08', tone: 'info' },
      { id: 't-3', day: 1, start: 9, end: 10, title: 'Écriture', subtitle: 'CP A · Salle 08', tone: 'accent' },
      { id: 't-4', day: 1, start: 16.5, end: 17.5, title: 'Échecs', subtitle: 'Club · Salle 08', tone: 'warning' },
      { id: 't-5', day: 2, start: 9, end: 11, title: 'Sortie musée', subtitle: 'Toute la classe', tone: 'danger' },
      { id: 't-6', day: 3, start: 10, end: 11, title: 'Arts plastiques', subtitle: 'Atelier 2', tone: 'accent' },
      { id: 't-7', day: 4, start: 9, end: 10, title: 'Conseil de classe', subtitle: 'Salle des professeurs', tone: 'info' },
    ],
    attendance,
    dataRequests: [
      { id: 'dr-1', type: 'export', subject: 'Famille Martin', requestedAt: '2026-11-12', status: 'in_progress', dueAt: '2026-12-12' },
      { id: 'dr-2', type: 'erasure', subject: 'Ancien élève — anonymisation', requestedAt: '2026-11-05', status: 'pending', dueAt: '2026-12-05' },
    ],
  }
}
