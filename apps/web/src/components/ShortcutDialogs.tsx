import { useTranslation } from 'react-i18next'
import {
  CalendarDays, ClipboardCheck, Clock, Mail, ShieldAlert, Sparkles, UserPlus,
} from 'lucide-react'
import { CommandPalette, Modal, type CommandItem } from '@schoolos/ui'

const Row = ({ keys, label }: { keys: string[]; label: string }) => (
  <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
    <span className="text-sm text-content">{label}</span>
    <span className="flex shrink-0 items-center gap-1">
      {keys.map(key => <kbd key={key} className="ui-kbd">{key}</kbd>)}
    </span>
  </div>
)

export function ShortcutsHelpDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange: (value: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('shortcuts.title')} description={t('shortcuts.subtitle')} size="sm">
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('shortcuts.groupNavigation')}</p>
          <Row keys={['⌘', 'K']} label={t('shortcuts.palette')} />
          <Row keys={['/']} label={t('shortcuts.search')} />
          <Row keys={['G', '→', 'S']} label={t('shortcuts.goStudents')} />
          <Row keys={['?']} label={t('shortcuts.help')} />
          <Row keys={['Esc']} label={t('shortcuts.escape')} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">{t('shortcuts.groupActions')}</p>
          <Row keys={['N']} label={t('shortcuts.quickAdd')} />
          <Row keys={['⌘', '↵']} label={t('shortcuts.primary')} />
          <Row keys={['⌘', 'S']} label={t('shortcuts.save')} />
        </div>
      </div>
    </Modal>
  )
}

export function QuickAddDialog({ open, onOpenChange, onNavigate }: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onNavigate: (path: string) => void
}) {
  const { t } = useTranslation()
  const group = t('shortcuts.groupActions')
  const items: CommandItem[] = [
    { id: 'student', label: t('quick.addStudent'), group, icon: <UserPlus className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/people/students/new') },
    { id: 'concern', label: t('quick.logConcern'), group, icon: <ShieldAlert className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/safeguarding/new') },
    { id: 'activity', label: t('quick.enrolActivity'), group, icon: <CalendarDays className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/activities') },
    { id: 'message', label: t('quick.messageParent'), group, icon: <Mail className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/communication/messages') },
    { id: 'attendance', label: t('quick.takeAttendance'), group, icon: <ClipboardCheck className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/activities') },
    { id: 'timetable', label: t('quick.viewTimetable'), group, icon: <Clock className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/dashboard') },
    { id: 'ai', label: t('quick.approveAi'), group, icon: <Sparkles className="h-4 w-4" aria-hidden />, onSelect: () => onNavigate('/app/ai/suggestions') },
  ]
  return (
    <CommandPalette
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      label={t('action.quickAdd')}
    />
  )
}
