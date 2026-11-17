import { forwardRef } from 'react'
import { cn } from '../lib/cn'
import { Button, type ButtonProps } from './Button'

export interface IconButtonProps extends ButtonProps {
  /** Accessible name and native tooltip for the icon-only action. */
  label: string
}

/** Icon-only variant of the single Button system (never a separate button implementation). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, variant = 'ghost', size = 'icon', ...props }, ref,
) {
  return (
    <Button ref={ref} type="button" aria-label={label} title={label} variant={variant} size={size}
      className={cn('shrink-0', className)} {...props} />
  )
})
