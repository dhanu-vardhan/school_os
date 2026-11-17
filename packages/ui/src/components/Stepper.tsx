import { Check } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export function Stepper({ steps, current, onStepClick }: {
  steps: { title: string; description?: string }[]; current: number; onStepClick?: (i: number) => void
}) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-start" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.title} className="flex flex-1 items-start gap-3">
            <Button variant="bare" disabled={!onStepClick} onClick={() => onStepClick?.(i)}
              aria-label={step.title}
              aria-current={active ? 'step' : undefined}
              className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                done ? 'border-action-success bg-action-success text-action-success-fg' : active ? 'border-action-primary bg-action-primary text-action-primary-fg' : 'border-line-control bg-surface text-content-subtle')}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </Button>
            <div className="min-w-0 pt-1">
              <p className={cn('text-sm font-medium', active ? 'text-content' : 'text-content-muted')}>{step.title}</p>
              {step.description && <p className="text-xs text-content-subtle">{step.description}</p>}
            </div>
            {i < steps.length - 1 && <span className="mt-4 hidden h-px flex-1 bg-line sm:block" />}
          </li>
        )
      })}
    </ol>
  )
}
