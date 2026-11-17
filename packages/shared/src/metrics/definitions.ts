import type {
  MetricDefinition,
  MetricId,
  MetricParameterDefinition,
  LocalizedText,
  MetricRole,
  GoodDirection,
  MetricUnit,
  MetricDomain,
} from './types'

const ALL_SCOPED: MetricRole[] = [
  'director', 'school_admin', 'deputy', 'teacher', 'parent', 'student', 'analyst', 'auditor',
]
const LEADERSHIP: MetricRole[] = ['director', 'school_admin', 'deputy', 'analyst', 'auditor']
const FINANCE: MetricRole[] = ['director', 'school_admin', 'finance', 'analyst', 'auditor']

type DefInput = Omit<MetricDefinition, 'version'> & { version?: string }

function def(input: DefInput): MetricDefinition {
  return { version: '1.0.0', ...input }
}

const caveat = (fr: string, en: string): LocalizedText => ({ fr, en })

/** Association caveat required on every correlation-style metric. */
const ASSOCIATION = caveat(
  "Association, et non causalité : ce graphique décrit une relation, pas une cause.",
  'Association, not causation: this chart describes a relationship, not a cause.',
)

/** Intake/context banner required on value-added style metrics. */
const INTAKE = caveat(
  "Les écarts peuvent refléter le recrutement et la taille des groupes ; ceci n'est pas une évaluation des enseignants.",
  'Differences may reflect intake and group size; this is not a measure of teacher quality.',
)

const DEFINITIONS: MetricDefinition[] = [
  // ---------------------------------------------------------------- attendance
  def({
    id: 'attendance.rate', domain: 'attendance',
    name: { fr: 'Taux de présence', en: 'Attendance rate' },
    definition: { fr: 'Part des demi-journées où l’élève était présent.', en: 'Share of expected half-days the pupil was present.' },
    formula: 'present_half_days / expected_half_days (open school days only)',
    grain: 'student × school day × session', unit: 'percent', good: 'up', nMin: 10, roles: ALL_SCOPED,
    caveats: [caveat('Les absences justifiées comptent comme non présentes ici ; elles sont détaillées séparément.', 'Justified absences count as not present here; they are detailed separately.')],
    params: ['attendance.chronicThreshold'],
  }),
  def({
    id: 'attendance.unjustified_rate', domain: 'attendance',
    name: { fr: 'Taux d’absence injustifiée', en: 'Unjustified absence rate' },
    definition: { fr: 'Part des demi-journées manquées sans justification acceptée.', en: 'Share of expected half-days missed with no accepted justification.' },
    formula: 'unjustified_absence_half_days / expected_half_days',
    grain: 'student × session', unit: 'percent', good: 'down', nMin: 10, roles: ALL_SCOPED,
    caveats: [caveat('Une justification en attente est injustifiée jusqu’à acceptation ; le délai est affiché séparément.', 'A pending justification is unjustified until accepted; the lag is shown separately.')],
  }),
  def({
    id: 'attendance.justified_rate', domain: 'attendance',
    name: { fr: 'Taux d’absence justifiée', en: 'Justified absence rate' },
    definition: { fr: 'Part des demi-journées manquées avec justification acceptée.', en: 'Share of expected half-days missed with an accepted justification.' },
    formula: 'justified_absence_half_days / expected_half_days',
    grain: 'student × session', unit: 'percent', good: 'neutral', nMin: 10, roles: ALL_SCOPED,
    caveats: [caveat('Aucun motif de santé ou catégorie sensible n’est disponible en analytique.', 'No health reason or sensitive category is available in analytics.')],
  }),
  def({
    id: 'attendance.lateness_rate', domain: 'attendance',
    name: { fr: 'Taux de retard', en: 'Lateness rate' },
    definition: { fr: 'Part des séances où l’élève est arrivé après la fermeture du registre.', en: 'Share of sessions where the pupil arrived after the register closed.' },
    formula: 'late_sessions / expected_sessions',
    grain: 'student × session', unit: 'percent', good: 'down', nMin: 10, roles: ALL_SCOPED,
    caveats: [], params: [],
  }),
  def({
    id: 'attendance.avg_minutes_late', domain: 'attendance',
    name: { fr: 'Retard moyen (minutes)', en: 'Average minutes late' },
    definition: { fr: 'Moyenne des minutes de retard lors des arrivées tardives.', en: 'Mean minutes late across late arrivals only.' },
    formula: 'Σ minutes_late / count(late_sessions); t-based 95% CI',
    grain: 'student × late session', unit: 'minutes', good: 'down', nMin: 10, roles: ALL_SCOPED,
    caveats: [caveat('Les retards justifiés sont exclus ; n = nombre d’arrivées tardives.', 'Justified late passes excluded; n = number of late arrivals.')],
  }),
  def({
    id: 'attendance.chronic_flag', domain: 'attendance',
    name: { fr: 'Repérage absence chronique', en: 'Chronic absence flag' },
    definition: { fr: 'Signal de soutien lorsque la présence sur 4 semaines est sous le seuil.', en: 'Support flag when rolling 4-week attendance is below the cutoff.' },
    formula: 'rolling_attendance_rate(28d) < threshold (default 0.90)',
    grain: 'student × snapshot', unit: 'boolean', good: 'down', nMin: 20,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'],
    caveats: [caveat('Règle transparente, pas une prédiction. Langage bienveillant : « a besoin de soutien ».', 'Transparent rule, not a prediction. Supportive language: “needs support”.')],
    params: ['attendance.chronicThreshold', 'attendance.chronicWindowDays'],
    requiresDpoReview: true,
  }),
  def({
    id: 'attendance.streak', domain: 'attendance',
    name: { fr: 'Série d’absence', en: 'Absence streak' },
    definition: { fr: 'Nombre maximal de jours d’école consécutifs absents.', en: 'Longest run of consecutive absent school days.' },
    formula: 'max(run_length(absence_day)) over consecutive open school days',
    grain: 'student × window', unit: 'days', good: 'down', nMin: 10,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'parent', 'student', 'analyst', 'auditor'],
    caveats: [caveat('Les vacances interrompent la série ; un rappel bienveillant, jamais une action automatique.', 'Holidays split the streak; a caring reminder, never an automated action.')],
  }),
  def({
    id: 'attendance.weekday_period_distribution', domain: 'attendance',
    name: { fr: 'Répartition jour / séquence', en: 'Weekday × period distribution' },
    definition: { fr: 'Taux d’absence et de retard par jour et par séquence.', en: 'Absence and lateness rates by weekday and period.' },
    formula: 'group attendance.rate and lateness_rate by (weekday, period)',
    grain: 'session', unit: 'percent', good: 'neutral', nMin: 10, roles: LEADERSHIP,
    caveats: [caveat('Les cellules sous le seuil sont masquées et fusionnées ; aucune ré-identification.', 'Cells below threshold are hidden and merged; no re-identification.')],
  }),
  def({
    id: 'attendance.monday_friday_effect', domain: 'attendance',
    name: { fr: 'Effet lundi / vendredi', en: 'Monday–Friday effect' },
    definition: { fr: 'Écart d’absence entre le lundi/vendredi et le reste de la semaine.', en: 'Difference in absence rate on Mon/Fri versus Tue–Thu.' },
    formula: 'rate(Mon,Fri) − rate(Tue,Wed,Thu), seasonality-aware CI',
    grain: 'week × weekday', unit: 'points', good: 'down', nMin: 6, roles: LEADERSHIP,
    caveats: [ASSOCIATION],
  }),
  def({
    id: 'attendance.post_holiday_dip', domain: 'attendance',
    name: { fr: 'Baisse après les vacances', en: 'Post-holiday return dip' },
    definition: { fr: 'Écart de présence les 3 premiers jours après les vacances.', en: 'Attendance change in the first 3 open days after a holiday.' },
    formula: 'rate(first 3 open days) − rate(preceding 28d), paired by term',
    grain: 'holiday event × group', unit: 'points', good: 'down', nMin: 20, roles: LEADERSHIP,
    caveats: [caveat('Dates des vacances de la zone C ; fermetures imprévues annotées séparément.', 'Zone C holiday dates; unplanned closures annotated separately.')],
  }),
  def({
    id: 'attendance.justification_lag', domain: 'attendance',
    name: { fr: 'Délai de justification', en: 'Absence-to-justification lag' },
    definition: { fr: 'Médiane des jours entre absence et justification acceptée.', en: 'Median days between absence and accepted justification.' },
    formula: 'median(justified_at − absence_date) in school days; IQR',
    grain: 'absence event', unit: 'days', good: 'down', nMin: 10, roles: LEADERSHIP,
    caveats: [caveat('Un long délai est souvent un problème de procédure, pas de comportement.', 'A long lag is often a process issue, not pupil behaviour.')],
  }),

  // --------------------------------------------------------------------- marks
  def({
    id: 'marks.weighted_average', domain: 'marks',
    name: { fr: 'Moyenne pondérée', en: 'Weighted average' },
    definition: { fr: 'Moyenne des notes après coefficient, sur 20.', en: 'Mean of marks after coefficients, on a /20 scale.' },
    formula: 'Σ(mark_20 × coefficient) / Σ(coefficient), excluding dispensed',
    grain: 'student × assessment', unit: 'points', good: 'up', nMin: 3, roles: ALL_SCOPED,
    caveats: [caveat('Les notes absentes et dispensées sont exclues ; détail dans « Expliquer ».', 'Absent and dispensed marks are excluded; see “Explain”.')],
  }),
  def({
    id: 'marks.median', domain: 'marks',
    name: { fr: 'Médiane', en: 'Median' },
    definition: { fr: 'Note du milieu de la distribution.', en: 'Middle mark of the distribution.' },
    formula: 'P50 of normalised marks', grain: 'group × subject × term',
    unit: 'points', good: 'up', nMin: 5, roles: ALL_SCOPED, caveats: [],
  }),
  def({
    id: 'marks.std_dev', domain: 'marks',
    name: { fr: 'Écart-type', en: 'Standard deviation' },
    definition: { fr: 'Dispersion des notes autour de la moyenne.', en: 'Spread of marks around the mean.' },
    formula: 'sqrt(Σ(x−x̄)²/(n−1))', grain: 'group × subject × term',
    unit: 'points', good: 'neutral', nMin: 5, roles: ALL_SCOPED,
    caveats: [caveat('Une forte dispersion peut refléter des cohortes différentes.', 'High spread may reflect different cohorts.')],
  }),
  def({
    id: 'marks.percentile_band', domain: 'marks',
    name: { fr: 'Bande de percentile', en: 'Percentile band' },
    definition: { fr: 'Position d’une note dans la distribution de la cohorte.', en: 'Position of a mark within the cohort distribution.' },
    formula: 'linear-interpolated percentile; bands P10/P25/P50/P75/P90',
    grain: 'group × subject × term', unit: 'percent', good: 'neutral', nMin: 20, roles: LEADERSHIP,
    caveats: [caveat('Relatif à la cohorte ; jamais utilisé pour étiqueter un élève.', 'Cohort-relative; never used to label a pupil.')],
  }),
  def({
    id: 'marks.pass_rate', domain: 'marks',
    name: { fr: 'Taux de réussite', en: 'Pass rate' },
    definition: { fr: 'Part des notes au-dessus du seuil de réussite.', en: 'Share of marks at or above the pass threshold.' },
    formula: 'count(mark_20 ≥ threshold) / count(assessed marks); Wilson 95% CI',
    grain: 'student × assessment → group', unit: 'percent', good: 'up', nMin: 5, roles: ALL_SCOPED,
    caveats: [], params: ['marks.passThreshold'],
  }),
  def({
    id: 'marks.distribution', domain: 'marks',
    name: { fr: 'Distribution des notes', en: 'Mark distribution' },
    definition: { fr: 'Histogramme des notes par tranches fixes.', en: 'Histogram of marks in fixed bins.' },
    formula: 'hist(mark_20, bins=2 points); ceiling/floor flag at >30%',
    grain: 'group × subject × term', unit: 'count', good: 'neutral', nMin: 10, roles: ALL_SCOPED,
    caveats: [caveat('Tranches identiques entre les périodes ; pas de re-binning.', 'Bins identical across periods; no re-binning.')],
  }),
  def({
    id: 'marks.progression', domain: 'marks',
    name: { fr: 'Progression', en: 'Progression' },
    definition: { fr: 'Écart de moyenne entre deux trimestres.', en: 'Change in weighted average between consecutive terms.' },
    formula: 'mean(term T) − mean(term T−1), paired where possible',
    grain: 'student × term → group', unit: 'points', good: 'up', nMin: 5, roles: ALL_SCOPED,
    caveats: [caveat('Méthode appariée ou non indiquée ; écarts liés au recrutement possibles.', 'Paired/unpaired method shown; intake differences possible.')],
  }),
  def({
    id: 'marks.value_added', domain: 'marks',
    name: { fr: 'Progression ajustée', en: 'Value-added (progress)' },
    definition: { fr: 'Écart entre la note obtenue et celle attendue d’après le trimestre précédent.', en: 'Actual mark minus the mark expected from prior attainment.' },
    formula: 'actual − (α + β × prior), OLS on cohort, β ∈ [0,1.2]; t-based CI',
    grain: 'class/subject × term (aggregate only)', unit: 'points', good: 'up', nMin: 15,
    roles: ['director', 'school_admin', 'deputy', 'analyst', 'auditor', 'teacher'],
    caveats: [INTAKE],
  }),
  def({
    id: 'marks.benchmark_comparison', domain: 'marks',
    name: { fr: 'Comparaison de référence', en: 'Benchmark comparison' },
    definition: { fr: 'Écart entre un groupe et la référence classe/cohorte/école.', en: 'Difference between a group and class/cohort/school benchmark.' },
    formula: 'group_value − benchmark_value with CI of the difference',
    grain: 'group × term', unit: 'points', good: 'neutral', nMin: 10,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'],
    caveats: [caveat('Aucun classement des enseignants ; la référence est un contexte.', 'No staff ranking; the benchmark is context.')],
  }),
  def({
    id: 'assessment.difficulty', domain: 'assessment',
    name: { fr: 'Difficulté de l’évaluation', en: 'Assessment difficulty' },
    definition: { fr: 'Part des élèves ayant répondu correctement à une question.', en: 'Share of pupils answering an item correctly.' },
    formula: 'p = correct_count / attempted_count per item',
    grain: 'quiz item × cohort', unit: 'ratio', good: 'neutral', nMin: 10,
    roles: ['teacher', 'director', 'school_admin', 'analyst', 'auditor'], caveats: [],
  }),
  def({
    id: 'assessment.discrimination', domain: 'assessment',
    name: { fr: 'Pouvoir discriminant', en: 'Item discrimination' },
    definition: { fr: 'Capacité d’une question à distinguer les niveaux.', en: 'How well an item separates high and low performers.' },
    formula: 'point-biserial corr(item_binary, total_excluding_item)',
    grain: 'quiz item × cohort', unit: 'correlation', good: 'up', nMin: 15,
    roles: ['teacher', 'director', 'school_admin', 'analyst', 'auditor'], caveats: [ASSOCIATION],
  }),
  def({
    id: 'marks.grade_inflation', domain: 'marks',
    name: { fr: 'Dérive des notes', en: 'Grade drift (aggregate)' },
    definition: { fr: 'Évolution annuelle de la moyenne à l’école.', en: 'Year-over-year change in school mean marks.' },
    formula: 'mean(year T) − mean(year T−1) on common assessment mix',
    grain: 'school × year × subject', unit: 'points', good: 'neutral', nMin: 100,
    roles: ['director', 'school_admin', 'group_admin', 'analyst', 'auditor'],
    caveats: [caveat('Agrégé uniquement ; aucun changement de mixte non contrôlé.', 'Aggregate only; changing assessment mix must be reviewed.')],
  }),

  // ---------------------------------------------------------------- engagement
  def({
    id: 'engagement.homework_completion_rate', domain: 'engagement',
    name: { fr: 'Taux de rendu des devoirs', en: 'Homework completion rate' },
    definition: { fr: 'Part des devoirs rendus.', en: 'Share of assigned homework submitted.' },
    formula: 'submitted / assigned (exemptions excluded)',
    grain: 'student × assignment', unit: 'percent', good: 'up', nMin: 5, roles: ALL_SCOPED, caveats: [],
  }),
  def({
    id: 'engagement.on_time_submission_rate', domain: 'engagement',
    name: { fr: 'Taux de rendu dans les délais', en: 'On-time submission rate' },
    definition: { fr: 'Part des devoirs rendus avant la date limite.', en: 'Share of submissions before the deadline.' },
    formula: 'submitted_before_due / submitted',
    grain: 'student × assignment', unit: 'percent', good: 'up', nMin: 5, roles: ALL_SCOPED, caveats: [],
  }),
  def({
    id: 'engagement.message_response_time', domain: 'engagement',
    name: { fr: 'Délai de réponse', en: 'Message response time' },
    definition: { fr: 'Délai médian avant première réponse, par rôle (agrégé).', en: 'Median time to first reply, by role (aggregate).' },
    formula: 'median(first_reply_at − sent_at); IQR; grouped by role',
    grain: 'message thread', unit: 'hours', good: 'down', nMin: 10,
    roles: ['director', 'school_admin', 'analyst', 'auditor'],
    caveats: [caveat('Aucun classement individuel du personnel.', 'No individual staff ranking.')],
  }),
  def({
    id: 'engagement.portal_activity', domain: 'engagement',
    name: { fr: 'Activité du portail', en: 'Parent portal activity' },
    definition: { fr: 'Part des responsables actifs sur 7 jours.', en: 'Share of guardians active in 7 days.' },
    formula: 'distinct_active_guardians(7d) / distinct_linked_guardians',
    grain: 'school × week', unit: 'percent', good: 'neutral', nMin: 20,
    roles: ['director', 'school_admin', 'analyst', 'auditor'],
    caveats: [caveat('Agrégé uniquement ; aucune surveillance par famille.', 'Aggregate only; no per-family surveillance.')],
  }),

  // ------------------------------------------------------------------ combined
  def({
    id: 'combined.attendance_attainment', domain: 'combined',
    name: { fr: 'Présence et résultats', en: 'Attendance–attainment relationship' },
    definition: { fr: 'Lien entre les bandes de présence et la moyenne.', en: 'Association between attendance bands and average marks.' },
    formula: 'marks.weighted_average grouped by attendance rate band',
    grain: 'student → band → aggregate', unit: 'points', good: 'neutral', nMin: 20,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'],
    caveats: [ASSOCIATION],
  }),
  def({
    id: 'combined.risk_composite', domain: 'combined',
    name: { fr: 'Indicateur de soutien', en: 'Support-needs composite' },
    definition: { fr: 'Indice explicite de besoins de soutien ; pas une note ni une prédiction.', en: 'Explicit support-needs index; not a score or a prediction.' },
    formula: 'Σ(weight_i × factor_i); weights 0.4/0.25/0.2/0.15 configurable',
    grain: 'student × snapshot', unit: 'index', good: 'down', nMin: 20,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst'],
    caveats: [caveat('Règles et poids visibles ; aucune décision automatique ; ton bienveillant.', 'Rules and weights visible; no automated decision; supportive tone.')],
    params: ['risk.weights', 'attendance.chronicThreshold', 'marks.passThreshold'],
    requiresDpoReview: true,
  }),
  def({
    id: 'combined.cohort_retention', domain: 'combined',
    name: { fr: 'Suivi de cohorte', en: 'Cohort retention' },
    definition: { fr: 'Part d’une cohorte encore inscrite chaque année.', en: 'Share of a starting cohort still enrolled each year.' },
    formula: 'count(enrolled at year T) / count(enrolled at year 0)',
    grain: 'cohort × year', unit: 'percent', good: 'up', nMin: 20,
    roles: ['director', 'school_admin', 'group_admin', 'analyst', 'auditor'], caveats: [],
  }),
  def({
    id: 'combined.subject_pass_matrix', domain: 'combined',
    name: { fr: 'Matrice de réussite', en: 'Subject pass-rate matrix' },
    definition: { fr: 'Taux de réussite par classe et matière.', en: 'Pass rate for each class × subject cell.' },
    formula: 'marks.pass_rate grouped by (class, subject)',
    grain: 'class × subject × term', unit: 'percent', good: 'up', nMin: 10,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'], caveats: [],
  }),

  // ------------------------------------------------------------ finance / ops
  def({
    id: 'finance.collection_rate', domain: 'finance',
    name: { fr: 'Taux de recouvrement', en: 'Fee collection rate' },
    definition: { fr: 'Part des frais facturés encaissés sur la période.', en: 'Share of invoiced fees collected in the period.' },
    formula: 'amount_collected_cents / amount_invoiced_cents',
    grain: 'school × period', unit: 'percent', good: 'up', nMin: 20, roles: FINANCE, caveats: [],
  }),
  def({
    id: 'finance.overdue_ageing', domain: 'finance',
    name: { fr: 'Ancienneté des impayés', en: 'Overdue ageing' },
    definition: { fr: 'Montants impayés par tranche d’ancienneté.', en: 'Outstanding amounts by days-past-due bucket.' },
    formula: 'SUM(outstanding_cents) by age_bucket (0-30/31-60/61-90/90+)',
    grain: 'invoice → bucket', unit: 'money', good: 'down', nMin: 20, roles: FINANCE,
    caveats: [caveat('Listes familiales réservées au service finance.', 'Family-level lists restricted to finance.')],
  }),
  def({
    id: 'finance.collection_forecast', domain: 'finance',
    name: { fr: 'Prévision de recouvrement', en: 'Collection forecast' },
    definition: { fr: 'Estimation explicable des encaissements avec intervalle.', en: 'Explainable estimate of collections with prediction interval.' },
    formula: 'seasonal-naive + exponential smoothing; backtest MAPE; 80/95% PI',
    grain: 'school × week', unit: 'money', good: 'neutral', nMin: 8, roles: FINANCE,
    caveats: [caveat('La prévision est une estimation, pas un fait ; aucune décision automatique.', 'A forecast is an estimate, not a fact; no automated decisions.')],
  }),
  def({
    id: 'ops.cost_per_student', domain: 'ops',
    name: { fr: 'Coût par élève', en: 'Cost per student' },
    definition: { fr: 'Coût de fonctionnement par élève (si données disponibles).', en: 'Operating cost per enrolled student (if data exists).' },
    formula: 'Σ cost_cents / count(enrolled_students)',
    grain: 'school × year', unit: 'money', good: 'neutral', nMin: 50,
    roles: ['director', 'school_admin', 'finance', 'group_admin', 'auditor'],
    caveats: [], unavailableInDemo: true,
  }),

  // -------------------------------------------------------------- data quality
  def({
    id: 'dq.register_timeliness', domain: 'dq',
    name: { fr: 'Ponctualité des registres', en: 'Register timeliness' },
    definition: { fr: 'Part des registres pris avant l’heure limite.', en: 'Share of registers taken before the cutoff.' },
    formula: 'registers_before_cutoff / expected_registers',
    grain: 'class × session × day', unit: 'percent', good: 'up', nMin: 20,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'],
    caveats: [caveat('Signal de procédure, pas une évaluation individuelle.', 'A process signal, not an individual performance score.')],
  }),
  def({
    id: 'dq.mark_entry_completeness', domain: 'dq',
    name: { fr: 'Complétude des notes', en: 'Mark-entry completeness' },
    definition: { fr: 'Part des évaluations avec toutes les notes saisies.', en: 'Share of assessments with all marks entered.' },
    formula: 'entered_marks / expected_marks (dispensations excluded)',
    grain: 'assessment × class', unit: 'percent', good: 'up', nMin: 5,
    roles: ['director', 'school_admin', 'deputy', 'teacher', 'analyst', 'auditor'], caveats: [],
  }),
  def({
    id: 'dq.anomaly_count', domain: 'dq',
    name: { fr: 'Anomalies', en: 'Anomaly count' },
    definition: { fr: 'Nombre d’anomalies détectées par type de règle.', en: 'Count of flagged anomalies by rule type.' },
    formula: 'count(dq_rule_* results) by rule',
    grain: 'school × rule', unit: 'count', good: 'down', nMin: 1,
    roles: ['director', 'school_admin', 'analyst', 'auditor'],
    caveats: [caveat('Comptes uniquement ; le détail exige student.read et est audité.', 'Counts only; drill-down requires student.read and is audited.')],
  }),
  def({
    id: 'dq.guardian_coverage', domain: 'dq',
    name: { fr: 'Couverture des responsables', en: 'Guardian coverage' },
    definition: { fr: 'Part des élèves avec au moins un responsable joignable.', en: 'Share of pupils with at least one contactable guardian.' },
    formula: 'count(students_with_guardian) / count(enrolled_students)',
    grain: 'school × grade band', unit: 'percent', good: 'up', nMin: 20,
    roles: ['director', 'school_admin', 'deputy', 'analyst', 'auditor'], caveats: [],
  }),
]

/** Immutable, frozen registry keyed by metric id. */
export const METRIC_DEFINITIONS: Readonly<Record<MetricId, MetricDefinition>> = Object.freeze(
  Object.fromEntries(DEFINITIONS.map((m) => [m.id, Object.freeze(m)])),
)

export const METRIC_IDS: readonly MetricId[] = Object.freeze(DEFINITIONS.map((m) => m.id))

export function getMetricDefinition(id: MetricId): MetricDefinition | undefined {
  return METRIC_DEFINITIONS[id]
}

export function metricsForRole(role: MetricRole): MetricDefinition[] {
  return DEFINITIONS.filter((m) => m.roles.includes(role))
}

export function canViewMetric(id: MetricId, role: MetricRole): boolean {
  const metric = METRIC_DEFINITIONS[id]
  return Boolean(metric && metric.roles.includes(role))
}

/** Tenant-configurable parameters with safe defaults. */
export const METRIC_PARAMETERS: Readonly<Record<string, MetricParameterDefinition>> = Object.freeze({
  'attendance.chronicThreshold': {
    key: 'attendance.chronicThreshold',
    name: { fr: 'Seuil d’absence chronique', en: 'Chronic absence threshold' },
    description: { fr: 'En dessous de ce taux de présence, un signal de soutien est affiché.', en: 'Below this attendance rate, a support flag is shown.' },
    defaultValue: 0.9, min: 0.7, max: 1, step: 0.01, editableBy: ['director', 'school_admin'],
  },
  'attendance.chronicWindowDays': {
    key: 'attendance.chronicWindowDays',
    name: { fr: 'Fenêtre glissante (jours)', en: 'Rolling window (days)' },
    description: { fr: 'Nombre de jours calendaires de la fenêtre de présence.', en: 'Calendar days in the attendance window.' },
    defaultValue: 28, min: 14, max: 90, step: 7, editableBy: ['director', 'school_admin'],
  },
  'marks.passThreshold': {
    key: 'marks.passThreshold',
    name: { fr: 'Seuil de réussite', en: 'Pass threshold' },
    description: { fr: 'Note minimale sur 20 pour être considéré comme réussi.', en: 'Minimum mark out of 20 counted as a pass.' },
    defaultValue: 10, min: 0, max: 20, step: 0.5, editableBy: ['director', 'school_admin'],
  },
  'suppression.threshold': {
    key: 'suppression.threshold',
    name: { fr: 'Seuil de masquage', en: 'Small-cell suppression threshold' },
    description: { fr: 'Aucun groupe plus petit que ce seuil n’est affiché.', en: 'No group smaller than this threshold is displayed.' },
    defaultValue: 5, min: 3, max: 20, step: 1, editableBy: ['director', 'school_admin'],
  },
})

export const DEFAULT_SUPPRESSION_THRESHOLD = 5

export function metricDomainLabel(domain: MetricDomain): LocalizedText {
  const labels: Record<MetricDomain, LocalizedText> = {
    attendance: { fr: 'Présence', en: 'Attendance' },
    marks: { fr: 'Notes', en: 'Marks' },
    assessment: { fr: 'Évaluations', en: 'Assessment' },
    engagement: { fr: 'Engagement', en: 'Engagement' },
    combined: { fr: 'Croisé', en: 'Combined' },
    finance: { fr: 'Finance', en: 'Finance' },
    ops: { fr: 'Opérations', en: 'Operations' },
    dq: { fr: 'Qualité des données', en: 'Data quality' },
  }
  return labels[domain]
}

export type { GoodDirection, MetricDomain, MetricUnit }
