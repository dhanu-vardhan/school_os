import { ShieldCheck, Sparkles } from 'lucide-react'
import { AiDraftCard } from '../components/AiDraftCard'
import { PageHeader } from '../components/primitives'
import { useDashboard } from '../state/DashboardContext'

export function AiPage() {
  const { drafts } = useDashboard()
  const pending = drafts.filter((draft) => draft.status === 'draft').length

  return (
    <>
      <PageHeader
        eyebrow="Assistance"
        title="Recommandations IA"
        subtitle="Chaque suggestion reste un brouillon jusqu a une validation humaine explicite."
        actions={<span className="ds-badge indigo"><Sparkles size={12} />{pending} en attente</span>}
      />
      <div className="ds-card ds-card-pad" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <ShieldCheck size={18} color="#4f46e5" aria-hidden="true" />
        <span style={{ fontSize: 12, color: '#475467' }}>
          Gouvernance : aucune recommendation ne declenche d action automatique (messages, factures, effectifs). Les donnees affichees sont fictives.
        </span>
      </div>
      <div className="ds-ai-grid">
        {drafts.map((draft) => <AiDraftCard key={draft.id} draft={draft} />)}
      </div>
    </>
  )
}
