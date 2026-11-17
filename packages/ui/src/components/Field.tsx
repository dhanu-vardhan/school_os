import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import * as Label from '@radix-ui/react-label'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioPrimitive from '@radix-ui/react-radio-group'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check } from 'lucide-react'
import { cn } from '../lib/cn'

export function FormField({ label, hint, error, required, children, className, id }: {
  label?: string; hint?: string; error?: string; required?: boolean
  children: (props: { id: string; 'aria-describedby': string; 'aria-invalid': boolean }) => ReactNode
  className?: string; id?: string
}) {
  const auto = useId()
  const fieldId = id ?? auto
  const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label.Root htmlFor={fieldId} className="block text-xs font-medium text-content">
          {label}{required && <span className="ml-0.5 text-danger-600" aria-hidden>*</span>}
        </Label.Root>
      )}
      {children({ id: fieldId, 'aria-describedby': describedBy ?? '', 'aria-invalid': !!error })}
      {hint && !error && <p id={`${fieldId}-hint`} className="text-xs text-content-subtle">{hint}</p>}
      {error && <p id={`${fieldId}-error`} role="alert" className="text-xs font-medium text-danger-600">{error}</p>}
    </div>
  )
}

const baseField = 'focus-ring w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-content placeholder:text-content-subtle disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger-500'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseField, 'h-10', className)} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(baseField, 'resize-y', className)} {...props} />
  },
)

export function Checkbox({ label, description, className, ...props }: {
  label?: string; description?: string
} & Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'children'>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5', className)}>
      <CheckboxPrimitive.Root className="focus-ring mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line-strong bg-surface data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 disabled:opacity-50" {...props}>
        <CheckboxPrimitive.Indicator><Check className="h-3 w-3 text-white" strokeWidth={3} /></CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <span className="min-w-0 text-sm">
          {label && <span className="block font-medium text-content">{label}</span>}
          {description && <span className="block text-xs text-content-muted">{description}</span>}
        </span>
      )}
    </label>
  )
}

export function RadioGroup({ options, value, onValueChange, name, className }: {
  options: { value: string; label: string; description?: string }[]
  value?: string; onValueChange?: (v: string) => void; name?: string; className?: string
}) {
  return (
    <RadioPrimitive.Root value={value} onValueChange={onValueChange} name={name} className={cn('space-y-2', className)}>
      {options.map(o => (
        <label key={o.value} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-3 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/50 dark:has-[:checked]:bg-brand-500/10">
          <RadioPrimitive.Item value={o.value} className="focus-ring mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface data-[state=checked]:border-brand-600">
            <RadioPrimitive.Indicator className="h-2 w-2 rounded-full bg-brand-600" />
          </RadioPrimitive.Item>
          <span className="text-sm">
            <span className="block font-medium text-content">{o.label}</span>
            {o.description && <span className="block text-xs text-content-muted">{o.description}</span>}
          </span>
        </label>
      ))}
    </RadioPrimitive.Root>
  )
}

export function Switch({ checked, onCheckedChange, label, description, disabled }: {
  checked?: boolean; onCheckedChange?: (v: boolean) => void; label?: string; description?: string; disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-4">
      {(label || description) && (
        <span className="min-w-0 text-sm">
          {label && <span className="block font-medium text-content">{label}</span>}
          {description && <span className="block text-xs text-content-muted">{description}</span>}
        </span>
      )}
      <SwitchPrimitive.Root checked={checked} onCheckedChange={onCheckedChange} disabled={disabled}
        className="focus-ring relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors data-[state=checked]:bg-brand-600 dark:bg-neutral-700 disabled:opacity-50">
        <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </label>
  )
}
