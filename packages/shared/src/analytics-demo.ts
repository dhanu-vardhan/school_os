/**
 * FLAGGED DEMO DATA ADAPTER — never import from a production code path.
 *
 * Generates three school years of deterministic synthetic analytics facts for the
 * demo tenant (2024-25, 2025-26, 2026-27 to date). Upstream academic fact tables do
 * not exist yet (see docs/ANALYTICS_DESIGN.md §2), so every response built from this
 * data carries `meta.mock = true` and the UI shows a “Mock data” badge. Contracts are
 * identical to the governed API so real data can drop in later without UI changes.
 *
 * Planted patterns (documented in docs/DEMO_SCRIPT.md):
 *  P1 Monday absence cluster in class c-6e (2025-26, terms 1–2).
 *  P2 One too-hard maths quiz item (p≈0.18, n=24).
 *  P3 Cohort 2024 improving after an intervention (term 2 → term 3, +2.5 pts).
 *  P4 Winter dip + zone C post-holiday dips in attendance.
 *  P5 Seasonal fee-collection dips in September and December.
 *  P6 Low register timeliness in c-cm2 (≈78%).
 */

/** Structural mirror of analytics-core's NormalisedMark, kept local to avoid a package cycle. */
export interface DemoMark {
  value: number
  scaleMax: number
  coefficient: number
  dispensed?: boolean
  absent?: boolean
  studentKey: string
}

export const ANALYTICS_DEMO_SCHOOL_ID = '11111111-1111-4111-8111-111111111111'

export const ACADEMIC_YEARS = ['2024-25', '2025-26', '2026-27'] as const
export const TERMS = ['T1', 'T2', 'T3'] as const

export interface ClassDim {
  classKey: string
  label: string
  level: string
  headcount: number
}

export interface DailyAttendanceFact {
  date: string
  classKey: string
  year: string
  term: string
  weekday: number // 0 = Monday
  period: number
  present: number
  expected: number
  justified: number
  unjustified: number
  late: number
  minutesLateSum: number
  lateEvents: number
  registersTaken: number
  registersOnTime: number
}

export interface AssessmentFact {
  assessmentKey: string
  subject: string
  classKey: string
  term: string
  year: string
  marks: DemoMark[]
}

export interface ItemStatFact {
  assessmentKey: string
  itemLabel: string
  correct: number
  attempted: number
  totalExcludingItem: number[]
}

export interface HomeworkFact {
  classKey: string
  period: string
  assigned: number
  submitted: number
  onTime: number
}

export interface FinanceFact {
  period: string // YYYY-MM
  year: string
  invoicedCents: number
  collectedCents: number
  overdueCents: number
  invoiceCount: number
  /** Fixed ageing buckets; amounts are integer cents. */
  ageingBuckets: { label: string; outstandingCents: number; invoiceCount: number }[]
}

export interface StudentTermFact {
  studentKey: string
  classKey: string
  cohort: string
  term: string
  year: string
  attendanceRate: number
  averageMark: number
  priorAverageMark: number | null
  homeworkRate: number
  unjustifiedRate: number
  chronicFlag: boolean
}

export interface DataQualityFact {
  rule: string
  count: number
  schoolId: string
}

export interface AnalyticsDemoData {
  schoolId: string
  generatedAt: string
  years: readonly string[]
  classDims: ClassDim[]
  attendanceDaily: DailyAttendanceFact[]
  assessments: AssessmentFact[]
  itemStats: ItemStatFact[]
  homework: HomeworkFact[]
  finance: FinanceFact[]
  studentTerms: StudentTermFact[]
  dataQuality: DataQualityFact[]
  /** Freshness string shown in the UI. */
  dataAsOf: string
}

// Deterministic PRNG (mulberry32), local to avoid a shared→analytics-core cycle.
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CLASS_DIMS: ClassDim[] = [
  { classKey: 'c-ms', label: 'MS', level: 'Maternelle', headcount: 22 },
  { classKey: 'c-cp', label: 'CP A', level: 'CP', headcount: 25 },
  { classKey: 'c-ce1', label: 'CE1', level: 'CE1', headcount: 24 },
  { classKey: 'c-ce2', label: 'CE2', level: 'CE2', headcount: 23 },
  { classKey: 'c-cm1', label: 'CM1', level: 'CM1', headcount: 24 },
  { classKey: 'c-cm2', label: 'CM2', level: 'CM2', headcount: 22 },
  { classKey: 'c-6e', label: '6e B', level: '6e', headcount: 26 },
  { classKey: 'c-5e', label: '5e A', level: '5e', headcount: 24 },
]

const SUBJECTS = ['Français', 'Mathématiques', 'Histoire', 'Sciences', 'Anglais']
/** Zone C holiday starts (approximate, used for the post-holiday dip pattern). */
export const ANALYTICS_DEMO_HOLIDAYS = [
  '2024-10-19', '2024-12-21', '2025-02-08', '2025-04-05', '2025-07-05',
  '2025-10-18', '2025-12-20', '2026-02-07', '2026-04-04', '2026-07-04', '2026-10-17',
] as const
const HOLIDAY_STARTS: readonly string[] = ANALYTICS_DEMO_HOLIDAYS

function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function termFor(month: number): string {
  if (month >= 9 || month === 0) return 'T1'
  if (month >= 1 && month <= 3) return 'T2'
  return 'T3'
}

/** School days for a year, excluding weekends and a simple summer break. */
function schoolDays(yearStart: number): string[] {
  const days: string[] = []
  const start = new Date(Date.UTC(yearStart, 8, 1))
  const end = new Date(Date.UTC(yearStart + 1, 5, 30))
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay()
    const month = d.getUTCMonth()
    if (day === 0 || day === 6) continue
    if (month === 6 || month === 7) continue
    days.push(iso(d))
  }
  return days
}

let cache: AnalyticsDemoData | null = null

/** Generate (once) and return the flagged demo analytics dataset. */
export function getAnalyticsDemoData(): AnalyticsDemoData {
  if (cache) return cache
  const rand = rng(20261117)
  const generatedAt = '2026-11-17T08:15:00Z'

  const attendanceDaily: DailyAttendanceFact[] = []
  const assessments: AssessmentFact[] = []
  const itemStats: ItemStatFact[] = []
  const homework: HomeworkFact[] = []
  const finance: FinanceFact[] = []
  const studentTerms: StudentTermFact[] = []

  for (let yi = 0; yi < ACADEMIC_YEARS.length; yi++) {
    const year = ACADEMIC_YEARS[yi]
    const yearStart = 2024 + yi
    const days = schoolDays(yearStart)
    const isCurrentYear = yi === ACADEMIC_YEARS.length - 1
    const activeDays = isCurrentYear ? days.filter((d) => d <= '2026-11-17') : days

    // ---- attendance: per class per school day (2 sessions collapsed into counts)
    for (const cls of CLASS_DIMS) {
      const base = 0.945 - (cls.classKey === 'c-6e' ? 0.012 : 0)
      for (const date of activeDays) {
        const d = new Date(`${date}T00:00:00Z`)
        const weekday = (d.getUTCDay() + 6) % 7
        const month = d.getUTCMonth() + 1
        const winterDip = month === 1 || month === 2 ? 0.018 : 0
        const mondayFriday = weekday === 0 || weekday === 4 ? 0.012 : 0
        const postHoliday = HOLIDAY_STARTS.some((h) => {
          const diff = (new Date(date).getTime() - new Date(h).getTime()) / 86400000
          return diff >= 0 && diff <= 3
        }) ? 0.035 : 0
        // P1: planted Monday cluster at c-6e in 2025-26, terms 1–2.
        const plantedMonday = cls.classKey === 'c-6e' && year === '2025-26' && weekday === 0
          && date >= '2025-09-01' && date <= '2026-03-31' ? 0.12 : 0
        // P6: c-cm2 registers often late.
        const onTimeRate = cls.classKey === 'c-cm2' ? 0.78 : 0.96

        for (let period = 0; period < 2; period++) {
          const expected = cls.headcount
          const absenceNoise = (rand() - 0.5) * 0.02
          const absenceRate = Math.max(0.01, Math.min(0.25,
            1 - base + winterDip + mondayFriday + postHoliday + plantedMonday + absenceNoise))
          const unjustified = Math.round(expected * absenceRate * (0.55 + rand() * 0.2))
          const justified = Math.max(0, Math.round(expected * absenceRate) - unjustified)
          const late = Math.round(expected * (0.03 + (weekday === 0 ? 0.01 : 0) + rand() * 0.015))
          const lateEvents = late
          attendanceDaily.push({
            date, classKey: cls.classKey, year,
            term: termFor(month), weekday, period,
            present: expected - unjustified - justified - late,
            expected, justified, unjustified, late,
            minutesLateSum: lateEvents * (6 + Math.round(rand() * 12)),
            lateEvents,
            registersTaken: 1,
            registersOnTime: rand() < onTimeRate ? 1 : 0,
          })
        }
      }
    }

    // ---- assessments: 3 terms × 5 subjects × 3 assessments per class
    for (const cls of CLASS_DIMS) {
      for (const term of TERMS) {
        for (const subject of SUBJECTS) {
          for (let a = 1; a <= 3; a++) {
            const assessmentKey = `${year}-${term}-${cls.classKey}-${subject.toLowerCase().replace(' ', '-')}-${a}`
            const subjectBase = subject === 'Mathématiques' ? 10.6 : subject === 'Français' ? 11.2 : 11.8
            const classEffect = cls.classKey === 'c-6e' ? -0.9 : cls.classKey === 'c-cp' ? 0.5 : 0
            // P3: cohort 2024 improving after intervention in 2025-26 T3.
            const intervention = cls.classKey === 'c-6e' && year === '2025-26' && term === 'T3' ? 2.5 : 0
            const termDrift = term === 'T3' ? 0.4 : term === 'T2' ? 0.2 : 0
            const centre = subjectBase + classEffect + intervention + termDrift + (rand() - 0.5) * 1.2
            const marks: AssessmentFact['marks'] = []
            for (let s = 0; s < cls.headcount; s++) {
              const jitter = (rand() + rand() + rand() - 1.5) * 6
              const value = Math.max(0, Math.min(20, centre + jitter))
              marks.push({
                studentKey: `${cls.classKey}-stu-${s}`,
                value: Math.round(value * 2) / 2,
                scaleMax: 20,
                coefficient: a === 3 ? 2 : 1,
                dispensed: rand() < 0.01,
                absent: rand() < 0.02,
              })
            }
            assessments.push({ assessmentKey, subject, classKey: cls.classKey, term, year, marks })

            // Item stats for the last maths assessment of each class/term.
            if (subject === 'Mathématiques' && a === 3) {
              const attempted = marks.filter((m) => !m.dispensed && !m.absent).length
              // P2: planted too-hard item in one assessment.
              const correct = assessmentKey.includes('2025-26-T2-c-6e')
                ? Math.round(attempted * 0.18)
                : Math.round(attempted * (0.35 + rand() * 0.4))
              itemStats.push({
                assessmentKey,
                itemLabel: 'Q3 — fractions',
                correct,
                attempted,
                totalExcludingItem: marks.filter((m) => !m.dispensed && !m.absent).map((m) => m.value),
              })
            }
          }
        }
      }

      for (const period of TERMS) {
        const assigned = cls.headcount * 6
        const baseRate = cls.classKey === 'c-6e' && year === '2025-26' && period === 'T3' ? 0.78 : 0.86
        const submitted = Math.round(assigned * (baseRate + (rand() - 0.5) * 0.06))
        homework.push({
          classKey: cls.classKey,
          period: `${year}-${period}`,
          assigned,
          submitted,
          onTime: Math.round(submitted * (0.88 + (rand() - 0.5) * 0.06)),
        })
      }
    }

    // ---- student-term facts (for risk lists, bins and value-added) from assessment marks
    const marksByStudent = new Map<string, { sum: number; weight: number; prior: number }>()
    for (const assessment of assessments.filter((a) => a.year === year)) {
      for (const mark of assessment.marks) {
        if (mark.dispensed || mark.absent) continue
        const normalised = (mark.value / mark.scaleMax) * 20
        const entry = marksByStudent.get(mark.studentKey) ?? { sum: 0, weight: 0, prior: 0 }
        entry.sum += normalised * mark.coefficient
        entry.weight += mark.coefficient
        marksByStudent.set(mark.studentKey, entry)
      }
    }
    for (const [key, entry] of marksByStudent) {
      const classKey = key.split('-stu-')[0]
      const avg = entry.weight ? entry.sum / entry.weight : 10
      const classAttendance = attendanceDaily
        .filter((a) => a.classKey === classKey && a.year === year)
        .reduce((acc, a) => ({ present: acc.present + a.present, expected: acc.expected + a.expected, unjustified: acc.unjustified + a.unjustified }), { present: 0, expected: 0, unjustified: 0 })
      const attendanceRate = classAttendance.expected ? classAttendance.present / classAttendance.expected : 0.94
      const unjustifiedRate = classAttendance.expected ? classAttendance.unjustified / classAttendance.expected : 0.03
      const homeworkRate = 0.8 + rand() * 0.18
      for (const term of TERMS) {
        studentTerms.push({
          studentKey: key,
          classKey,
          cohort: year === '2024-25' ? '2024' : year === '2025-26' ? '2025' : '2026',
          term, year,
          attendanceRate,
          averageMark: Math.max(0, Math.min(20, avg + (term === 'T1' ? -0.4 : term === 'T3' ? 0.4 : 0))),
          priorAverageMark: yi > 0 || term !== 'T1' ? avg - 0.6 : null,
          homeworkRate,
          unjustifiedRate,
          chronicFlag: attendanceRate < 0.9,
        })
      }
    }

    // ---- finance: monthly series with seasonal dips
    for (let month = 8; month <= 11; month++) {
      const period = `${yearStart}-${String(month + 1).padStart(2, '0')}`
      const dip = month === 8 || month === 11 ? 0.16 : 0.05
      const invoiceCount = 150 + Math.round(rand() * 40)
      const invoicedCents = invoiceCount * 18000
      const collectedCents = Math.round(invoicedCents * (0.94 - dip + (rand() - 0.5) * 0.02))
      const overdue = invoicedCents - collectedCents
      const shares = [0.46, 0.28, 0.16, 0.10]
      finance.push({
        period, year, invoicedCents, collectedCents,
        overdueCents: overdue,
        invoiceCount,
        ageingBuckets: ['0–30 j', '31–60 j', '61–90 j', '90+ j'].map((label, i) => ({
          label,
          outstandingCents: Math.round(overdue * shares[i]),
          invoiceCount: Math.round(invoiceCount * shares[i] * 0.2),
        })),
      })
    }
  }

  const dataQuality: DataQualityFact[] = [
    { rule: 'duplicate_students', count: 2, schoolId: ANALYTICS_DEMO_SCHOOL_ID },
    { rule: 'missing_guardian', count: 3, schoolId: ANALYTICS_DEMO_SCHOOL_ID },
    { rule: 'orphaned_mark', count: 1, schoolId: ANALYTICS_DEMO_SCHOOL_ID },
  ]

  cache = {
    schoolId: ANALYTICS_DEMO_SCHOOL_ID,
    generatedAt,
    years: ACADEMIC_YEARS,
    classDims: CLASS_DIMS,
    attendanceDaily,
    assessments,
    itemStats,
    homework,
    finance,
    studentTerms,
    dataQuality,
    dataAsOf: generatedAt,
  }
  return cache
}

/** Reset the generator cache (used by tests and the demo reset action). */
export function resetAnalyticsDemoData(): void {
  cache = null
}
