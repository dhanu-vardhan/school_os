import * as Dialog from '@radix-ui/react-dialog'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './Button'

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md' }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string
  children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(var(--overlay))] backdrop-blur-sm data-[state=open]:animate-page-in" />
        <Dialog.Content className={cn('ui-scale-in fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl', widths[size])}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-content">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-content-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close dialog"><X className="h-4 w-4" /></Button>
            </Dialog.Close>
          </div>
          <div className="ui-scroll max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Drawer({ open, onOpenChange, title, children, side = 'right' }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; children: React.ReactNode; side?: 'right' | 'left' | 'bottom'
}) {
  const placement = {
    right: 'inset-y-0 right-0 w-full max-w-md border-l',
    left: 'inset-y-0 left-0 w-full max-w-md border-r',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t',
  }[side]
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(var(--overlay))] backdrop-blur-sm" />
        <Dialog.Content className={cn('fixed z-50 flex flex-col border-line bg-surface shadow-xl', placement)}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <Dialog.Title className="font-display text-lg font-semibold text-content">{title}</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost" size="icon-sm" aria-label="Close"><X className="h-4 w-4" /></Button></Dialog.Close>
          </div>
          <div className="ui-scroll flex-1 overflow-y-auto p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, message, confirmLabel = 'Confirm', onConfirm, danger }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; message: string
  confirmLabel?: string; onConfirm: () => void; danger?: boolean
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgb(var(--overlay))] backdrop-blur-sm" />
        <AlertDialog.Content className="ui-scale-in fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface p-6 shadow-xl">
          <AlertDialog.Title className="font-display text-lg font-semibold text-content">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-content-muted">{message}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild><Button variant="outline">Cancel</Button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
