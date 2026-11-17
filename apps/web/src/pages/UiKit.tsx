import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Download, Plus, Settings2 } from 'lucide-react'
import {
  Accordion, AiLabel, Avatar, AvatarGroup, Badge, Banner, Breadcrumbs, Button, CalendarGrid,
  Card, CardBody, CardHeader, Checkbox, Combobox, DatePicker, DropdownMenu, EmptyState,
  ErrorState, FileDrop, IconButton, Input, Kanban, Modal, Pagination, Popover, Progress, RadioGroup,
  SearchField, Select, Skeleton, SkeletonList, StatCard, Stepper, StatusPill, Switch, Tabs,
  Textarea, Timeline, ToastHost, Tooltip, toast,
} from '@schoolos/ui'
import { PageHeader } from '../components/Screen'
import { BarChart, TrendChart } from '../components/Charts'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-display text-lg font-semibold text-content">{title}</h2>
      {description && <p className="mb-3 text-sm text-content-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function UiKitPage() {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [select, setSelect] = useState('b')
  const [toggle, setToggle] = useState(true)
  const [date, setDate] = useState('2026-11-17')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState('one')

  const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'c', label: 'Gamma' }]

  return (
    <div className="ui-page">
      <PageHeader
        title={t('uikit.title')}
        subtitle={t('uikit.subtitle')}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link to="/ui-kit/colors">{t('uikit.colors')}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/ui-kit/buttons">{t('uikit.buttons')}</Link></Button>
            <Badge tone="brand">v1</Badge>
          </>
        }
      />
      <Breadcrumbs items={[{ label: 'Components' }, { label: t('uikit.title') }]} />

      <Section title="Buttons & actions" description="Primary, secondary, outline, ghost, danger, success; icon buttons with accessible labels.">
        <Card><CardBody className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button variant="success">Success</Button>
          <Button loading>Loading</Button><Button disabled>Disabled</Button>
          <Button asChild><a href="#top">Link button</a></Button>
          <IconButton label="Notifications"><Bell className="h-4 w-4" /></IconButton>
          <IconButton label="Settings"><Settings2 className="h-4 w-4" /></IconButton>
          <Tooltip content="Helpful hint"><Button variant="outline">Tooltip</Button></Tooltip>
          <DropdownMenu trigger={<Button variant="outline" size="sm">Menu</Button>} items={[{ label: 'Edit' }, { label: 'Duplicate' }, { label: 'Delete', danger: true }]} />
          <Popover trigger={<Button variant="outline" size="sm">Popover</Button>}><p className="w-48 text-sm text-content-muted">Popover content.</p></Popover>
          <Button variant="outline" size="sm" onClick={() => setModal(true)}>Modal</Button>
        </CardBody></Card>
      </Section>

      <Section title="Badges & status" description="Status pills use consistent tones across modules.">
        <Card><CardBody className="flex flex-wrap items-center gap-2">
          <Badge>Neutral</Badge><Badge tone="brand">Brand</Badge><Badge tone="success">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Danger</Badge><Badge tone="info">Info</Badge>
          <StatusPill status="open" /><StatusPill status="under_review" /><StatusPill status="closed" /><StatusPill status="proposed" /><StatusPill status="approved" />
          <AiLabel />
        </CardBody></Card>
      </Section>

      <Section title="Forms" description="Keyboard accessible fields with labels, hints and validation messaging.">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card><CardHeader title="Inputs" /><CardBody className="space-y-3">
            <Input placeholder="Text input" value={text} onChange={e => setText(e.target.value)} />
            <Textarea placeholder="Textarea" rows={3} />
            <Select value={select} onValueChange={setSelect} options={options} />
            <Combobox value={select} onValueChange={setSelect} options={options} />
            <SearchField value={text} onChange={setText} placeholder="SearchField" />
            <DatePicker label="Date" value={date} onChange={setDate} />
          </CardBody></Card>
          <Card><CardHeader title="Selection" /><CardBody className="space-y-4">
            <Checkbox label="Checkbox" description="With description" defaultChecked />
            <Checkbox label="Unchecked" />
            <RadioGroup value={select} onValueChange={setSelect} options={options} />
            <Switch checked={toggle} onCheckedChange={setToggle} label="Switch" description="Toggle a setting" />
          </CardBody></Card>
          <Card><CardHeader title="Upload & navigation" /><CardBody className="space-y-4">
            <FileDrop label="Drop a document" accept=".pdf,.jpg" maxMb={5} />
            <Stepper steps={[{ title: 'Identity' }, { title: 'School' }, { title: 'Review' }]} current={1} />
            <Pagination page={page} pageSize={5} total={23} onPageChange={setPage} />
          </CardBody></Card>
        </div>
      </Section>

      <Section title="Data display" description="Cards, tables, charts and timelines.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Enrolment" value={412} trend={3} icon={<Plus className="h-4 w-4" />} />
          <StatCard label="Attendance" value="94%" tone="accent" />
          <StatCard label="Open concerns" value={2} tone="danger" />
          <StatCard label="AI pending" value={3} tone="info" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card><CardHeader title="Trend" /><CardBody><TrendChart data={[{ label: 'W1', value: 88 }, { label: 'W2', value: 92 }, { label: 'W3', value: 90 }, { label: 'W4', value: 95 }]} /></CardBody></Card>
          <Card><CardHeader title="Bars" /><CardBody><BarChart data={[{ label: 'MS', value: 22 }, { label: 'CP', value: 23 }, { label: 'CE1', value: 24 }, { label: 'CE2', value: 21 }]} /></CardBody></Card>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Card><CardHeader title="Timeline" /><CardBody><Timeline items={[{ id: '1', title: 'Created', time: '2026-11-01' }, { id: '2', title: 'Updated', time: '2026-11-10' }]} /></CardBody></Card>
          <Card><CardHeader title="Calendar" /><CardBody><CalendarGrid days={[{ label: 'Mon' }, { label: 'Tue' }, { label: 'Wed' }]} events={[{ id: 'e1', day: 0, start: 9, end: 10.5, title: 'Lecture' }]} startHour={9} endHour={12} /></CardBody></Card>
          <Card><CardHeader title="Kanban" /><CardBody><Kanban columns={[{ id: 'todo', title: 'To do', cards: [{ id: '1', title: 'Review draft' }] }, { id: 'done', title: 'Done', cards: [{ id: '2', title: 'Publish notice' }] }]} /></CardBody></Card>
        </div>
      </Section>

      <Section title="Feedback & states" description="Loading, empty, error, progress and banners.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardBody className="space-y-4"><Skeleton className="h-8 w-1/2" /><Progress value={68} label="Completion" /><Banner tone="info" title="Info banner">Details here.</Banner><Banner tone="warning" title="Warning banner">Details here.</Banner><Banner tone="danger" title="Danger banner">Details here.</Banner><Banner tone="success" title="Success banner">Details here.</Banner></CardBody></Card>
          <Card><CardBody className="space-y-4"><SkeletonList rows={2} /><EmptyState title={t('state.empty')} description={t('state.emptyHint')} /><ErrorState message={t('state.errorHint')} onRetry={() => toast.info(t('common.retry'))} /></CardBody></Card>
        </div>
      </Section>

      <Section title="Overlays & disclosure" description="Tabs, accordion and modal dialogs.">
        <Card><CardBody className="space-y-5">
          <Tabs value={tab} onValueChange={setTab} items={[{ value: 'one', label: 'Tab one', content: <p className="text-sm text-content-muted">First panel</p> }, { value: 'two', label: 'Tab two', content: <p className="text-sm text-content-muted">Second panel</p> }]} />
          <Accordion items={[{ value: 'a', title: 'Section A', content: 'Content A' }, { value: 'b', title: 'Section B', content: 'Content B' }]} />
        </CardBody></Card>
      </Section>

      <div className="pb-10"><Button variant="outline" onClick={() => toast.success('Toast example')}><Download className="h-4 w-4" />Toast</Button></div>
      <Modal open={modal} onOpenChange={setModal} title="Example modal" description="Accessible dialog with focus management." footer={<Button onClick={() => setModal(false)}>{t('common.close')}</Button>}><p className="text-sm text-content-muted">Modal body.</p></Modal>
    </div>
  )
}
