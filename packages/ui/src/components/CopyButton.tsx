import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { useActionLabels } from './ActionLabels'
import { Button, type ButtonProps } from './Button'

/** Copies only the caller-provided value; never log, toast or display that value. */
export function CopyButton({ value, label, onCopied, variant = 'outline', size = 'sm' }: {
  value: string
  label?: string
  onCopied?: () => void
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}) {
  const labels = useActionLabels()
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
      onCopied?.()
    } catch {
      setState('error')
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2000)
  }

  const icon = state === 'copied' ? <Check className="h-4 w-4" aria-hidden />
    : state === 'error' ? <AlertTriangle className="h-4 w-4" aria-hidden />
      : <Copy className="h-4 w-4" aria-hidden />
  const text = state === 'copied' ? labels.copied : state === 'error' ? labels.copyFailed : (label ?? labels.copy)

  return (
    <>
      <Button variant={variant} size={size} icon={icon} onClick={copy}>{text}</Button>
      <span role="status" className="ui-sr-only">{state === 'idle' ? '' : text}</span>
    </>
  )
}
