import { forwardRef } from 'react'
import { cn } from '../lib/cn'
import { buttonVariants } from '../lib/variants'
import type { VariantProps } from 'class-variance-authority'

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, variant = 'ghost', size = 'icon', ...props }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})
