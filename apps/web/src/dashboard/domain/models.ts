export type Period = '30d' | '90d' | '12m'

export type Tone = 'indigo' | 'emerald' | 'amber' | 'sky'

export interface Kpi {
  id: string
  label: string
  value: string
  delta: number
  hint: string
  trend: number[]
  tone: Tone
}

export interface SeriesPoint {
  label: string
  current: number
  previous: number
}

export interface FunnelStep {
  label: string
  value: number
}

export interface Segment {
  name: string
  value: number
  color: string
}

export interface Family {
  id: string
  name: string
  school: string
  segment: 'Platinum' | 'Growth' | 'Standard'
  lifetimeCents: number
  health: number
  lastActive: string
}

export interface Invoice {
  id: string
  family: string
  label: string
  amountCents: number
  due: string
  status: 'Paid' | 'Pending' | 'Overdue'
}

export type DraftStatus = 'draft' | 'accepted' | 'dismissed'

export interface AiDraft {
  id: string
  title: string
  summary: string
  impact: string
  confidence: number
  category: 'Retention' | 'Revenue' | 'Operations'
  status: DraftStatus
  createdAt: string
  reviewedAt?: string
}

export interface ActivityItem {
  id: string
  actor: string
  action: string
  target: string
  time: string
}

export interface DashboardData {
  kpis: Kpi[]
  revenue: Record<Period, SeriesPoint[]>
  engagement: Record<Period, SeriesPoint[]>
  funnel: FunnelStep[]
  segments: Segment[]
  planMix: Segment[]
  families: Family[]
  invoices: Invoice[]
  drafts: AiDraft[]
  activity: ActivityItem[]
  retention: SeriesPoint[]
}
