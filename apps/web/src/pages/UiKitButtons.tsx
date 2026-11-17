import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays, Download, Eye, Moon, Pencil, Plus, Trash2, UserPlus, Users,
} from 'lucide-react'
import {
  BulkActionBar, Button, ButtonGroup, ChipFilter, CopyButton, DropdownMenuItem, Fab,
  IconButton, QuickAddMenu, RowActions, SegmentedControl, ShareMenu, SpeedDial, SplitButton,
  StickyActionBar, ToggleButton, toast, undoToast,
} from '@schoolos/ui'
import type { ButtonProps } from '@schoolos/ui'
import { usePreferences } from '../app/preferences'
import { PageHeader } from '../components/Screen'

const VARIANTS: NonNullable<ButtonProps['variant']>[] = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'ai']

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display text-lg font-semibold text-content">{title}</h2>
      {description && <p className="mb-3 text-sm text-content-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

const Panel = ({ children }: { children: ReactNode }) => <div className="ui-card p-4">{children}</div>

export function UiKitButtonsPage() {
  const { t } = useTranslation()
  const preferences = usePreferences()
  const [view, setView] = useState('day')
  const [toggle, setToggle] = useState(false)
  const [chip, setChip] = useState(true)
  const [selected, setSelected] = useState(3)
  const [log, setLog] = useState('')

  const note = (message: string) => setLog(message)
  const groupItems = [
    { id: 'day', label: t('uikit.exampleDay'), icon: <CalendarDays className="h-4 w-4" aria-hidden />, onSelect: () => setView('day') },
    { id: 'week', label: t('uikit.exampleWeek'), onSelect: () => setView('week') },
    { id: 'month', label: t('uikit.exampleMonth'), onSelect: () => setView('month') },
    { id: 'other', label: t('uikit.exampleGroup'), disabled: true, onSelect: () => undefined },
  ]
  const splitItems: DropdownMenuItem[] = [
    { label: t('action.edit'), icon: <Pencil className="h-4 w-4" aria-hidden />, group: t('action.actions'), shortcut: '⌘E', onSelect: () => note(t('action.edit')) },
    { label: t('action.exportCsv'), icon: <Download className="h-4 w-4" aria-hidden />, shortcut: '⌘⇧E', onSelect: () => note(t('action.export')) },
    { label: t('uikit.exampleDanger'), icon: <Trash2 className="h-4 w-4" aria-hidden />, danger: true, onSelect: () => note(t('uikit.exampleDanger')) },
  ]
  const quickItems: DropdownMenuItem[] = [
    { label: t('uikit.exampleItem1'), icon: <UserPlus className="h-4 w-4" aria-hidden />, group: t('uikit.compositeActions'), onSelect: () => note(t('uikit.exampleItem1')) },
    { label: t('uikit.exampleItem2'), icon: <Plus className="h-4 w-4" aria-hidden />, onSelect: () => note(t('uikit.exampleItem2')) },
    { label: t('uikit.exampleItem3'), icon: <CalendarDays className="h-4 w-4" aria-hidden />, onSelect: () => note(t('uikit.exampleItem3')) },
  ]
  const rowItems: DropdownMenuItem[] = [
    { label: t('action.view'), icon: <Eye className="h-4 w-4" aria-hidden />, onSelect: () => note(t('action.view')) },
    { label: t('action.edit'), icon: <Pencil className="h-4 w-4" aria-hidden />, onSelect: () => note(t('action.edit')) },
    { label: t('action.duplicate'), icon: <Users className="h-4 w-4" aria-hidden />, onSelect: () => note(t('action.duplicate')) },
    { label: t('action.remove'), icon: <Trash2 className="h-4 w-4" aria-hidden />, danger: true, onSelect: () => note(t('action.remove')) },
  ]
  const fabItems = [
    { id: 'student', label: t('uikit.exampleItem1'), icon: <UserPlus className="h-4 w-4" aria-hidden />, onClick: () => note(t('uikit.exampleItem1')) },
    { id: 'activity', label: t('uikit.exampleItem3'), icon: <CalendarDays className="h-4 w-4" aria-hidden />, onClick: () => note(t('uikit.exampleItem3')) },
  ]

  return (
    <div className="ui-page">
      <PageHeader
        title={t('uikit.buttons')}
        subtitle={t('uikit.actionPrinciples')}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/ui-kit/colors">{t('uikit.colors')}</Link></Button>
            <IconButton label={t('uikit.toggleDark')} variant="outline" size="icon-sm"
              aria-pressed={preferences.theme === 'dark'}
              onClick={() => preferences.setTheme(preferences.theme === 'dark' ? 'light' : 'dark')}>
              <Moon className="h-4 w-4" aria-hidden />
            </IconButton>
          </>
        }
      />

      <Section title={t('uikit.stateMatrix')} description={t('uikit.keyboardHelp')}>
        <div className="ui-card p-4 sm:hidden">
          {VARIANTS.map(variant => (
            <div key={variant} className="border-b border-line py-3 last:border-0">
              <p className="font-mono text-xs text-content-muted">{variant}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant={variant} size="sm">{t('uikit.examplePrimary')}</Button>
                <Button variant={variant} size="sm" loading>{t('uikit.exampleLoading')}</Button>
                <Button variant={variant} size="sm" disabled disabledReason={t('uikit.disabledReason')}>{t('uikit.examplePrimary')}</Button>
                <Button variant={variant} size="sm" shortcut="⌘S">{t('uikit.shortcutExample')}</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="ui-card hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-content-subtle">
              <tr>
                <th className="p-3">{t('uikit.variants')}</th>
                <th className="p-3">{t('uikit.restState')}</th>
                <th className="p-3">{t('uikit.loadingState')}</th>
                <th className="p-3">{t('uikit.disabledState')}</th>
                <th className="p-3">{t('uikit.shortcutState')}</th>
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map(variant => (
                <tr key={variant} className="border-t border-line">
                  <td className="p-3 font-mono text-xs text-content-muted">{variant}</td>
                  <td className="p-3"><Button variant={variant} size="sm">{t('uikit.examplePrimary')}</Button></td>
                  <td className="p-3"><Button variant={variant} size="sm" loading>{t('uikit.exampleLoading')}</Button></td>
                  <td className="p-3"><Button variant={variant} size="sm" disabled disabledReason={t('uikit.disabledReason')}>{t('uikit.examplePrimary')}</Button></td>
                  <td className="p-3"><Button variant={variant} size="sm" shortcut="⌘S">{t('uikit.shortcutExample')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t('uikit.variants')}>
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">{t('uikit.examplePrimary')}</Button>
            <Button size="md" variant="secondary">{t('uikit.exampleSecondary')}</Button>
            <Button size="lg" variant="ai">{t('uikit.exampleAi')}</Button>
            <Button asChild variant="outline"><a href="#top">{t('uikit.exampleLink')}</a></Button>
            <IconButton label={t('action.add')}><Plus className="h-4 w-4" aria-hidden /></IconButton>
            <ToggleButton pressed={toggle} onPressedChange={setToggle} label={t('uikit.exampleGroup')} />
            <ChipFilter label={t('uikit.exampleDay')} selected={chip} onToggle={setChip} />
            <CopyButton value="SC-DEMO-001" label={t('uikit.exampleCopy')} />
            <Button variant="outline" onClick={() => undoToast(t('uikit.undoMessage'), () => note(t('uikit.undoExample')), t('action.undo'))}>
              {t('uikit.undoExample')}
            </Button>
          </div>
          <p className="mt-3 min-h-5 text-xs text-content-subtle" role="status">{log}</p>
        </Panel>
      </Section>

      <Section title={t('uikit.compositeActions')}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <p className="mb-2 text-xs font-semibold text-content-muted">ButtonGroup / SegmentedControl</p>
            <div className="flex flex-wrap gap-3">
              <ButtonGroup items={groupItems} label={t('uikit.exampleGroup')} />
              <SegmentedControl value={view} onValueChange={setView} label={t('uikit.exampleGroup')}
                options={[
                  { value: 'day', label: t('uikit.exampleDay') },
                  { value: 'week', label: t('uikit.exampleWeek') },
                  { value: 'month', label: t('uikit.exampleMonth') },
                ]} />
            </div>
            <p className="mt-2 text-xs text-content-subtle">{view}</p>
          </Panel>
          <Panel>
            <p className="mb-2 text-xs font-semibold text-content-muted">SplitButton / DropdownMenu</p>
            <div className="flex flex-wrap gap-2">
              <SplitButton label={t('uikit.examplePrimary')} onClick={() => note(t('uikit.examplePrimary'))} items={splitItems} />
              <QuickAddMenu items={quickItems} />
              <ShareMenu onCopyLink={() => note(t('action.copyLink'))} onExportCsv={() => note(t('action.exportCsv'))} />
            </div>
          </Panel>
          <Panel>
            <p className="mb-2 text-xs font-semibold text-content-muted">{t('uikit.rowActions')}</p>
            <RowActions items={rowItems} label={t('uikit.exampleRow')} />
          </Panel>
          <Panel>
            <p className="mb-2 text-xs font-semibold text-content-muted">{t('uikit.bulk')}</p>
            <BulkActionBar count={selected} onClear={() => setSelected(0)}
              actions={[
                { label: t('uikit.exampleSecondary'), onClick: () => note(t('uikit.exampleSecondary')) },
                { label: t('uikit.exampleDanger'), danger: true, onClick: () => note(t('uikit.exampleDanger')) },
              ]} />
            <Button className="mt-3" variant="outline" size="sm" onClick={() => setSelected(3)}>{t('uikit.exampleRow')}</Button>
          </Panel>
        </div>
      </Section>

      <Section title={t('uikit.fab')}>
        <Panel>
          <div className="flex flex-wrap items-end gap-10">
            <Fab inline label={t('uikit.exampleItem1')} onClick={() => note(t('uikit.exampleItem1'))} />
            <SpeedDial inline label={t('action.quickAdd')} actions={fabItems} />
          </div>
        </Panel>
      </Section>

      <StickyActionBar
        title={t('uikit.exampleSticky')}
        primary={{ label: t('uikit.exampleSave'), onClick: () => toast.success(t('uikit.undoMessage')) }}
        secondary={[{ label: t('uikit.exampleSecondary'), onClick: () => note(t('uikit.exampleSecondary')) }]}
      />
      <div className="h-10" />
    </div>
  )
}
