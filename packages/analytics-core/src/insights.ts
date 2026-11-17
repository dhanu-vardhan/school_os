/**
 * Rule-based, explainable insight engine.
 *
 * Insights are deterministic findings over already-computed aggregates. Each carries
 * severity, evidence, a suggested action, a link to the evidence chart and a plain
 * “why am I seeing this”. No insight makes a decision about a child or a teacher.
 */

import type { MetricId } from '@schoolos/shared'
import { seasonalityAwareComparison, significanceSentence } from './trends'

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'opportunity'

export interface Insight {
  id: string
  dedupeKey: string
  severity: InsightSeverity
  title: { fr: string; en: string }
  evidence: { fr: string; en: string }
  suggestedAction: { fr: string; en: string }
  why: { fr: string; en: string }
  metricIds: MetricId[]
  /** Route/anchor used by the UI “View evidence” action. */
  evidenceLink: string
  filters?: Record<string, string>
  createdAt?: string
}

export interface InsightContext {
  schoolId?: string
  classId?: string
  subject?: string
  term?: string
  period?: string
}

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0, warning: 1, opportunity: 2, info: 3,
}

export function rankInsights(insights: readonly Insight[]): Insight[] {
  return [...insights].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

/** Per-user dismiss/snooze, persisted in non-sensitive preferences. */
export function visibleInsights(
  insights: readonly Insight[],
  dismissedKeys: readonly string[] = [],
  snoozed: Readonly<Record<string, string>> = {},
  now = new Date(),
): Insight[] {
  const dismissed = new Set(dismissedKeys)
  return rankInsights(insights.filter((i) => {
    if (dismissed.has(i.dedupeKey)) return false
    const until = snoozed[i.dedupeKey]
    return !until || new Date(until).getTime() <= now.getTime()
  }))
}

function makeInsight(
  key: string,
  severity: InsightSeverity,
  fr: [string, string, string, string],
  en: [string, string, string, string],
  metricIds: MetricId[],
  evidenceLink: string,
  ctx: InsightContext = {},
): Insight {
  return {
    id: `insight:${key}`,
    dedupeKey: key,
    severity,
    title: { fr: fr[0], en: en[0] },
    evidence: { fr: fr[1], en: en[1] },
    suggestedAction: { fr: fr[2], en: en[2] },
    why: { fr: fr[3], en: en[3] },
    metricIds,
    evidenceLink,
    filters: Object.fromEntries(Object.entries(ctx).filter(([, v]) => v !== undefined)) as Record<string, string>,
  }
}

// ---------------------------------------------------------------- attendance rules

/** Sudden attendance drop versus prior period, with adequate sample. */
export function suddenAttendanceDrop(
  current: number, previous: number, ciHalfWidth: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 20) return null
  const cmp = seasonalityAwareComparison(current, previous, ciHalfWidth, 'up')
  if (cmp.wording !== 'decreased') return null
  return makeInsight(
    `attendance-drop:${ctx.classId ?? 'school'}:${ctx.term ?? 'all'}`,
    'warning',
    [`La présence a baissé de ${Math.abs(cmp.change).toFixed(1)} pts`,
      cmp.detail,
      'Vérifier les registres et contacter les familles concernées avec bienveillance.',
      'Affiché car la baisse dépasse la variation normale et que l’échantillon est suffisant.'],
    [`Attendance fell by ${Math.abs(cmp.change).toFixed(1)} pts`,
      cmp.detail,
      'Check registers and contact the families concerned supportively.',
      'Shown because the drop exceeds normal variation and the sample is adequate.'],
    ['attendance.rate'], '/principal/analytics/attendance', ctx,
  )
}

/** Monday/Friday effect larger than a configurable practical threshold. */
export function weekdayCluster(
  effectPoints: number, weekday: string, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 6 || Math.abs(effectPoints) < 3) return null
  return makeInsight(
    `weekday-cluster:${weekday}:${ctx.classId ?? 'school'}`,
    'info',
    [`Absence plus fréquente le ${weekday}`,
      `Écart de ${effectPoints.toFixed(1)} pts par rapport aux autres jours (n=${n}).`,
      `Examiner les plages horaires et les événements du ${weekday}.`,
      'Règle : écart ≥ 3 pts sur au moins 6 semaines.'],
    [`Higher absence on ${weekday}`,
      `${effectPoints.toFixed(1)} pt difference versus other days (n=${n}).`,
      `Review the timetable and events on ${weekday}.`,
      'Rule: difference ≥ 3 pts across at least 6 weeks.'],
    ['attendance.monday_friday_effect', 'attendance.weekday_period_distribution'],
    '/principal/analytics/attendance', ctx,
  )
}

/** Rising lateness in a period. */
export function risingLateness(
  current: number, previous: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 20 || current <= previous + 2) return null
  return makeInsight(
    `lateness-rise:${ctx.classId ?? 'school'}:${ctx.period ?? ''}`,
    'warning',
    ['Les retards augmentent',
      `Taux de retard : ${current.toFixed(1)} % contre ${previous.toFixed(1)} % (n=${n}).`,
      'Vérifier les heures d’ouverture des registres et les rotations de transport.',
      'Règle : hausse ≥ 2 pts sur un effectif suffisant.'],
    ['Lateness is rising',
      `Lateness rate: ${current.toFixed(1)}% versus ${previous.toFixed(1)}% (n=${n}).`,
      'Check register-close times and transport changes.',
      'Rule: increase ≥ 2 pts with adequate sample.'],
    ['attendance.lateness_rate'], '/app/analytics/vie-scolaire', ctx,
  )
}

// -------------------------------------------------------------------- marks rules

/** Class below cohort with adequate n — no teacher ranking, supportive framing. */
export function classBelowCohort(
  classValue: number, cohortValue: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 10 || classValue >= cohortValue - 2) return null
  return makeInsight(
    `below-cohort:${ctx.classId ?? 'unknown'}:${ctx.subject ?? 'all'}`,
    'info',
    ['Une classe progresse moins vite que la cohorte',
      `${classValue.toFixed(1)}/20 contre ${cohortValue.toFixed(1)}/20 (n=${n}). Les écarts peuvent refléter le recrutement et la taille du groupe.`,
      'Regarder la répartition des notes et les évaluations avant toute action.',
      'Règle : écart ≥ 2 pts avec n ≥ 10 ; contexte de recrutement affiché.'],
    ['A class is progressing more slowly than the cohort',
      `${classValue.toFixed(1)}/20 versus ${cohortValue.toFixed(1)}/20 (n=${n}). Differences may reflect intake and group size.`,
      'Review mark distribution and assessments before acting.',
      'Rule: gap ≥ 2 pts with n ≥ 10; intake context shown.'],
    ['marks.benchmark_comparison', 'marks.value_added'], '/principal/analytics/academic', ctx,
  )
}

/** Ceiling or floor effect in a mark distribution. */
export function distributionSkew(
  ceiling: boolean, floor: boolean, topShare: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 10 || (!ceiling && !floor)) return null
  const kind = ceiling ? 'plafond' : 'plancher'
  return makeInsight(
    `dist-skew:${kind}:${ctx.subject ?? 'all'}`,
    'opportunity',
    [`Effet ${kind} dans les notes`,
      `${(topShare * 100).toFixed(0)} % des notes dans la tranche ${kind} (n=${n}).`,
      'Vérifier la difficulté des évaluations et les barèmes.',
      'Règle : plus de 30 % des notes dans une tranche extrême.'],
    [`${ceiling ? 'Ceiling' : 'Floor'} effect in marks`,
      `${(topShare * 100).toFixed(0)}% of marks in the ${ceiling ? 'top' : 'bottom'} bin (n=${n}).`,
      'Review assessment difficulty and marking schemes.',
      'Rule: more than 30% of marks in an extreme bin.'],
    ['marks.distribution'], '/principal/analytics/academic', ctx,
  )
}

/** Assessment too hard or too easy from item p-values. */
export function assessmentDifficulty(
  pValue: number, itemLabel: string, attempts: number, ctx: InsightContext = {},
): Insight | null {
  if (attempts < 10) return null
  const tooHard = pValue < 0.3
  const tooEasy = pValue > 0.9
  if (!tooHard && !tooEasy) return null
  return makeInsight(
    `assessment-difficulty:${itemLabel}:${ctx.subject ?? 'all'}`,
    'opportunity',
    [`Question ${tooHard ? 'trop difficile' : 'trop facile'}`,
      `Taux de réussite ${(pValue * 100).toFixed(0)} % sur ${attempts} tentatives (${itemLabel}).`,
      'Relire la question et le barème ; l’analyser en réunion de cycle.',
      'Règle : p < 0,3 ou p > 0,9 avec au moins 10 tentatives.'],
    [`Item ${tooHard ? 'too hard' : 'too easy'}`,
      `Success rate ${(pValue * 100).toFixed(0)}% over ${attempts} attempts (${itemLabel}).`,
      'Review the item and marking scheme at the subject meeting.',
      'Rule: p < 0.3 or p > 0.9 with at least 10 attempts.'],
    ['assessment.difficulty', 'assessment.discrimination'], '/teacher/analytics', ctx,
  )
}

// ----------------------------------------------------------- engagement / finance

export function homeworkDecline(
  current: number, previous: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 5 || current >= previous - 10) return null
  return makeInsight(
    `homework-decline:${ctx.classId ?? 'school'}`,
    'warning',
    ['Baisse du rendu des devoirs',
      `${current.toFixed(1)} % contre ${previous.toFixed(1)} % (n=${n}). ${significanceSentence(current - previous, 0)}`,
      'Vérifier la charge de travail et rappeler les échéances aux familles.',
      'Règle : baisse ≥ 10 pts avec au moins 5 devoirs.'],
    ['Homework completion is falling',
      `${current.toFixed(1)}% versus ${previous.toFixed(1)}% (n=${n}). ${significanceSentence(current - previous, 0)}`,
      'Review workload and remind families of deadlines.',
      'Rule: drop ≥ 10 pts across at least 5 assignments.'],
    ['engagement.homework_completion_rate'], '/teacher/analytics', ctx,
  )
}

export function dataQualityGap(
  rate: number, expected: number, ctx: InsightContext = {},
): Insight | null {
  if (expected < 20 || rate >= 90) return null
  return makeInsight(
    `dq-register:${ctx.classId ?? 'school'}`,
    'warning',
    ['Registres incomplets',
      `${rate.toFixed(1)} % des registres pris à temps (attendu : ${expected}).`,
      'Rappeler la procédure de saisie ; ceci est un signal de procédure, pas une évaluation.',
      'Règle : ponctualité < 90 % sur au moins 20 registres.'],
    ['Registers are incomplete',
      `${rate.toFixed(1)}% of registers taken on time (expected: ${expected}).`,
      'Remind staff of the entry procedure; this is a process signal, not a performance score.',
      'Rule: timeliness < 90% across at least 20 registers.'],
    ['dq.register_timeliness'], '/app/analytics/admin', ctx,
  )
}

export function collectionRisk(
  rate: number, overdueCents: number, n: number, ctx: InsightContext = {},
): Insight | null {
  if (n < 20 || rate >= 85) return null
  return makeInsight(
    'finance-collection-risk',
    'critical',
    ['Risque sur le recouvrement',
      `Taux de recouvrement ${rate.toFixed(1)} % ; impayés ${(overdueCents / 100).toFixed(0)} € (n=${n}).`,
      'Planifier les rappels et vérifier les échéanciers ; aucune décision automatique.',
      'Règle : recouvrement < 85 % sur au moins 20 factures.'],
    ['Collection-rate risk',
      `Collection rate ${rate.toFixed(1)}%; overdue ${(overdueCents / 100).toFixed(0)}€ (n=${n}).`,
      'Plan reminders and review payment plans; no automated decision.',
      'Rule: collection < 85% across at least 20 invoices.'],
    ['finance.collection_rate', 'finance.overdue_ageing'], '/finance/analytics', ctx,
  )
}

/** Aggregate all rule outputs for a dashboard. */
export function collectInsights(candidates: (Insight | null)[]): Insight[] {
  const seen = new Set<string>()
  const out: Insight[] = []
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate.dedupeKey)) continue
    seen.add(candidate.dedupeKey)
    out.push(candidate)
  }
  return rankInsights(out)
}
