import { Sparkles, Check, Pencil, X, ShieldCheck } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'
import { cn } from '../lib/cn'

export function AiLabel({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200', className)}>
      <Sparkles className="h-3 w-3" />AI-generated, review required
    </span>
  )
}

export function AiSuggestionCard({ id, feature, title, body, confidence, redacted, onAccept, onEdit, onReject }: {
  id: string; feature: string; title: string; body: string; confidence?: number; redacted?: boolean
  onAccept?: (id: string) => void; onEdit?: (id: string) => void; onReject?: (id: string) => void
}) {
  return (
    <article className="ui-card p-5" aria-labelledby={`ai-${id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiLabel />
        <Badge tone="neutral">{feature}</Badge>
      </div>
      <h3 id={`ai-${id}`} className="mt-3 font-display text-base font-semibold text-content">{title}</h3>
      <p className="mt-2 whitespace-pre-line rounded-md bg-surface-2 p-3 text-sm text-content-muted">{body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-content-subtle">
        {confidence !== undefined && <span className="tnum">Confidence {Math.round(confidence * 100)}%</span>}
        {redacted && <span className="inline-flex items-center gap-1 text-accent-700 dark:text-accent-300"><ShieldCheck className="h-3 w-3" />Redaction applied</span>}
        <span>Human approval required</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="success" onClick={() => onAccept?.(id)}><Check className="h-4 w-4" />Accept</Button>
        <Button size="sm" variant="outline" onClick={() => onEdit?.(id)}><Pencil className="h-4 w-4" />Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => onReject?.(id)}><X className="h-4 w-4" />Reject</Button>
      </div>
    </article>
  )
}

export function RedactionPreview({ original, redacted }: { original: string; redacted: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-line bg-surface-2 p-3">
        <p className="mb-1 text-xs font-semibold text-content-muted">Before (local only)</p>
        <p className="break-words font-mono text-xs text-content-subtle">{original}</p>
      </div>
      <div className="rounded-md border border-accent-200 bg-accent-50 p-3 dark:border-accent-500/30 dark:bg-accent-500/10">
        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-accent-700 dark:text-accent-300"><ShieldCheck className="h-3 w-3" />After redaction</p>
        <p className="break-words font-mono text-xs text-accent-900 dark:text-accent-100">{redacted}</p>
      </div>
    </div>
  )
}
