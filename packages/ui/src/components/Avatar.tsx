import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '../lib/cn'

export function Avatar({ name, src, className, size = 'md' }: {
  name: string; src?: string; className?: string; size?: 'sm' | 'md' | 'lg'
}) {
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  return (
    <AvatarPrimitive.Root className={cn('relative inline-flex shrink-0 overflow-hidden rounded-full border border-line', dims, className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={200} className="flex h-full w-full items-center justify-center bg-brand-100 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max)
  return (
    <div className="flex -space-x-2" aria-label={`${names.length} people`}>
      {visible.map((name, i) => <Avatar key={`${name}-${i}`} name={name} size="sm" className="ring-2 ring-surface" />)}
      {names.length > max && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-content-muted ring-2 ring-surface">
          +{names.length - max}
        </span>
      )}
    </div>
  )
}
