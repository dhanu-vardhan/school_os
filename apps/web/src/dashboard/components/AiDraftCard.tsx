import { Check, Clock, Sparkles, TrendingUp, X } from 'lucide-react'
import type { AiDraft } from '../domain/models'
import { useDashboard } from '../state/DashboardContext'
import { Badge, Card } from './primitives'

export function AiDraftCard({ draft }: { draft: AiDraft }) {
  const { reviewDraft } = useDashboard()
  const isDraft = draft.status === 'draft'

  return (
    <Card className="ds-ai-card">
      <div className="ds-ai-top">
        <Badge tone="indigo"><Sparkles size={12} aria-hidden="true" />{draft.category}</Badge>
        {draft.status === 'accepted' && <Badge tone="green"><Check size={12} />Approuve{draft.reviewedAt ? ` · ${draft.reviewedAt}` : ''}</Badge>}
        {draft.status === 'dismissed' && <Badge tone="gray"><X size={12} />Masque</Badge>}
        {isDraft && <span className="ds-ai-note">{draft.createdAt}</span>}
      </div>

      <h3 className="ds-ai-title">{draft.title}</h3>
      <p className="ds-ai-summary">{draft.summary}</p>
      <div className="ds-ai-impact"><TrendingUp size={15} aria-hidden="true" />{draft.impact}</div>

      <div className="ds-ai-foot">
        <div className="ds-confidence" title="Confiance du modele">
          Confiance {draft.confidence} %
          <span className="ds-confidence-bar"><i style={{ width: `${draft.confidence}%` }} /></span>
        </div>
        {isDraft ? (
          <div className="ds-actions" style={{ marginLeft: 'auto' }}>
            <button className="ds-btn ds-btn-sm" onClick={() => reviewDraft(draft.id, 'dismissed')}>Ignorer</button>
            <button className="ds-btn ds-btn-sm ds-btn-primary" onClick={() => reviewDraft(draft.id, 'accepted')}>Approuver</button>
          </div>
        ) : (
          <span className="ds-ai-note" style={{ marginLeft: 'auto' }}><Clock size={11} /> Revue humaine terminee</span>
        )}
      </div>
      {isDraft && <p className="ds-ai-note">Brouillon IA - aucune action automatique avant validation humaine.</p>}
    </Card>
  )
}
